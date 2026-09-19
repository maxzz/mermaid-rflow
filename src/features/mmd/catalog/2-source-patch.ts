import { findToken, lineWithoutComment } from '@/store/6-source-render-links';
import {
    classifyMermaidSource,
    defaultLabelFor,
    escapeLabel,
    extractHeader,
    findNodeDefinition,
    formatShapeInner,
    nextMermaidId,
    parseFlowStmt,
    prefixForShape,
    rebuildSource,
    wrapShape,
    type FlowDirection,
    type NodeDefSpan,
    type NodeShape,
} from './1-flowchart-source';

export type PatchOk = { ok: true; source: string; changed: boolean; };
export type PatchFail = { ok: false; reason: 'not-flowchart' | 'not-found' | 'noop'; };
export type PatchResult = PatchOk | PatchFail;

const notFlowchart = (): PatchFail => ({ ok: false, reason: 'not-flowchart' });
const unchanged = (source: string): PatchOk => ({ ok: true, source, changed: false });

export function setDirection(source: string, direction: FlowDirection): PatchResult {
    const header = extractHeader(source);
    if (header.kind === 'empty') {
        return { ok: true, source: `graph ${direction}\n`, changed: true };
    }
    if (header.kind !== 'flowchart') {
        return notFlowchart();
    }
    const nextDecl = header.declaration.replace(/\b(TD|TB|BT|LR|RL)\b/i, direction).replace(
        /^(flowchart|graph)\b(?!\s+(TD|TB|BT|LR|RL)\b)/i,
        `$1 ${direction}`,
    );
    if (nextDecl === header.declaration) {
        return unchanged(source);
    }
    return { ok: true, source: rebuildSource(header, nextDecl), changed: true };
}

export function renameNode(source: string, id: string, label: string): PatchResult {
    if (classifyMermaidSource(source) !== 'flowchart') {
        return notFlowchart();
    }
    const def = findNodeDefinition(source, id);
    if (!def) {
        const header = extractHeader(source);
        if (header.kind !== 'flowchart') {
            return notFlowchart();
        }
        const line = `    ${wrapShape(id, label || id, 'rect')}`;
        const body = header.body.endsWith('\n') || header.body === '' ? `${header.body}${line}\n` : `${header.body}\n${line}\n`;
        return { ok: true, source: rebuildSource(header, header.declaration, body), changed: true };
    }
    const nextLine = rewriteNodeLabel(def, label);
    if (nextLine === def.lineText) {
        return unchanged(source);
    }
    return replaceLine(source, def.line, nextLine);
}

export type AddNodeOpts = {
    shape: NodeShape;
    label?: string;
    fromId?: string;
    src?: string;
    icon?: string;
};

export function addNode(source: string, opts: AddNodeOpts): PatchResult {
    const header = extractHeader(source);
    if (header.kind === 'other') {
        return notFlowchart();
    }
    const working = header.kind === 'empty' ? 'graph TD\n' : source;
    const live = extractHeader(working);
    if (live.kind !== 'flowchart') {
        return notFlowchart();
    }
    const id = nextMermaidId(working, prefixForShape(opts.shape));
    const label = opts.label?.trim() || defaultLabelFor(opts.shape);
    const lines = [`    ${wrapShape(id, label, opts.shape, { src: opts.src, icon: opts.icon })}`];
    if (opts.fromId) {
        lines.push(`    ${opts.fromId} --> ${id}`);
    }
    const addition = `${lines.join('\n')}\n`;
    const body = live.body.endsWith('\n') || live.body === '' ? `${live.body}${addition}` : `${live.body}\n${addition}`;
    return { ok: true, source: rebuildSource(live, live.declaration, body), changed: true };
}

export function connectNodes(source: string, fromId: string, toId: string): PatchResult {
    if (classifyMermaidSource(source) !== 'flowchart') {
        return notFlowchart();
    }
    if (!fromId || !toId || fromId === toId) {
        return { ok: false, reason: 'noop' };
    }
    if (hasEdge(source, fromId, toId)) {
        return unchanged(source);
    }
    const header = extractHeader(source);
    if (header.kind !== 'flowchart') {
        return notFlowchart();
    }
    const line = `    ${fromId} --> ${toId}\n`;
    const body = header.body.endsWith('\n') || header.body === '' ? `${header.body}${line}` : `${header.body}\n${line}`;
    return { ok: true, source: rebuildSource(header, header.declaration, body), changed: true };
}

export function deleteNode(source: string, id: string): PatchResult {
    if (classifyMermaidSource(source) !== 'flowchart') {
        return notFlowchart();
    }
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    const next: string[] = [];
    let changed = false;
    for (const line of lines) {
        const rewritten = lineWithoutDeletedNode(line, id);
        if (rewritten === line) {
            next.push(line);
            continue;
        }
        changed = true;
        if (rewritten !== null) {
            next.push(rewritten);
        }
    }
    if (!changed) {
        return { ok: false, reason: 'not-found' };
    }
    return { ok: true, source: next.join('\n'), changed: true };
}

export function hasEdge(source: string, fromId: string, toId: string): boolean {
    for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
        const stmt = parseFlowStmt(line);
        if (stmt?.arrow && stmt.left.id === fromId && stmt.right?.id === toId) {
            return true;
        }
    }
    return false;
}

function lineWithoutDeletedNode(line: string, id: string): string | null {
    const clean = lineWithoutComment(line);
    if (!findToken(clean, id)) {
        return line;
    }
    if (/^\s*%%/.test(clean) || /^\s*(classDef|class|click|style|linkStyle)\b/i.test(clean)) {
        return line;
    }
    if (/^\s*subgraph\s+/i.test(clean)) {
        return line;
    }

    const stmt = parseFlowStmt(line);
    if (!stmt) {
        return line;
    }

    if (!stmt.arrow) {
        return stmt.left.id === id ? null : line;
    }

    if (stmt.left.id === id && stmt.right?.id === id) {
        return null;
    }
    if (stmt.left.id === id) {
        return keepOtherEndpoint(stmt.indent, stmt.right);
    }
    if (stmt.right?.id === id) {
        return keepOtherEndpoint(stmt.indent, stmt.left);
    }
    return line;
}

function keepOtherEndpoint(indent: string, token: { id: string; raw: string; } | null): string | null {
    if (!token) {
        return null;
    }
    if (token.raw.length > token.id.length) {
        return `${indent}${token.raw}`;
    }
    return null;
}

function rewriteNodeLabel(def: NodeDefSpan, label: string): string {
    if (def.atClose != null && def.labelStart === def.atClose) {
        return def.lineText.slice(0, def.atClose) + `, label: "${escapeLabel(label)}"` + def.lineText.slice(def.atClose);
    }
    const inner = def.atClose != null ? `"${escapeLabel(label)}"` : formatShapeInner(label);
    if (inner === def.lineText.slice(def.labelStart, def.labelEnd)) {
        return def.lineText;
    }
    return def.lineText.slice(0, def.labelStart) + inner + def.lineText.slice(def.labelEnd);
}

function replaceLine(source: string, index: number, nextLine: string): PatchOk {
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    lines[index] = nextLine;
    return { ok: true, source: lines.join('\n'), changed: true };
}
