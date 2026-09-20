import { findToken, lineWithoutComment } from '@/store/6-source-render-links';
import {
    classifyMermaidSource,
    defaultLabelFor,
    escapeLabel,
    extractHeader,
    findFlowEdge,
    findNodeDefinition,
    formatShapeInner,
    nextMermaidId,
    parseFlowStmt,
    prefixForShape,
    rebuildSource,
    wrapShape,
    type FlowDirection,
    type FlowEdgeSpan,
    type NodeDefSpan,
    type NodeShape,
    type WrapShapeExtra,
} from './1-flowchart-source';
import {
    applyStrokePatch,
    readEdgeStyleDecls,
    readLinkStyleMap,
    readNodeStyleDecls,
    removeNodeStyleLine,
    restyleLinksByIdentity,
    strokeFromDecls,
    upsertNodeStyleLine,
    writeLinkStyleMap,
    type ElementStroke,
} from './6-mmd-style';

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
    let patched = restyleLinksByIdentity(source, next.join('\n'));
    patched = removeNodeStyleLine(patched, id);
    return { ok: true, source: patched, changed: true };
}

export function deleteEdge(source: string, from: string, to: string, label?: string): PatchResult {
    if (classifyMermaidSource(source) !== 'flowchart') {
        return notFlowchart();
    }
    const edge = findFlowEdge(source, from, to, label);
    if (!edge) {
        return { ok: false, reason: 'not-found' };
    }
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    const kept = keptEndpointLines(edge);
    lines.splice(edge.line, 1, ...kept);
    const patched = restyleLinksByIdentity(source, lines.join('\n'));
    return { ok: true, source: patched, changed: true };
}

export function reconnectEdge(source: string, from: string, to: string, nextFrom: string, nextTo: string, label?: string): PatchResult {
    if (classifyMermaidSource(source) !== 'flowchart') {
        return notFlowchart();
    }
    if (!nextFrom || !nextTo || nextFrom === nextTo) {
        return { ok: false, reason: 'noop' };
    }
    const edge = findFlowEdge(source, from, to, label);
    const arrow = edge?.stmt.arrow;
    const right = edge?.stmt.right;
    if (!edge || !arrow || !right) {
        return { ok: false, reason: 'not-found' };
    }
    if (edge.from === nextFrom && edge.to === nextTo) {
        return unchanged(source);
    }
    const stmt = edge.stmt;
    const extras: string[] = [];
    let leftRaw = stmt.left.raw;
    let rightRaw = right.raw;
    if (nextFrom !== from) {
        if (isShapeToken(stmt.left)) {
            extras.push(`${stmt.indent}${stmt.left.raw}`);
        }
        leftRaw = nextFrom;
    }
    if (nextTo !== to) {
        if (isShapeToken(right)) {
            extras.push(`${stmt.indent}${right.raw}`);
        }
        rightRaw = nextTo;
    }
    const between = edge.lineText.slice(stmt.left.end, arrow.start);
    const arrowPart = edge.lineText.slice(arrow.start, arrow.end);
    const afterArrow = edge.lineText.slice(arrow.end, right.start);
    const tail = edge.lineText.slice(right.end);
    const nextLine = `${stmt.indent}${leftRaw}${between}${arrowPart}${afterArrow}${rightRaw}${tail}`;
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    lines.splice(edge.line, 1, nextLine, ...extras);
    const decls = readLinkStyleMap(source).get(edge.index);
    let patched = restyleLinksByIdentity(source, lines.join('\n'));
    if (decls) {
        const nextEdge = findFlowEdge(patched, nextFrom, nextTo, label);
        if (nextEdge) {
            const map = readLinkStyleMap(patched);
            map.set(nextEdge.index, decls);
            patched = writeLinkStyleMap(patched, map);
        }
    }
    return { ok: true, source: patched, changed: true };
}

export function setNodeStroke(source: string, id: string, patch: Partial<ElementStroke>): PatchResult {
    if (classifyMermaidSource(source) !== 'flowchart') {
        return notFlowchart();
    }
    const next = upsertNodeStyleLine(source, id, applyStrokePatch(readNodeStyleDecls(source, id), patch, 'node'));
    if (next === source) {
        return unchanged(source);
    }
    return { ok: true, source: next, changed: true };
}

export function setEdgeStroke(source: string, from: string, to: string, patch: Partial<ElementStroke>, label?: string): PatchResult {
    if (classifyMermaidSource(source) !== 'flowchart') {
        return notFlowchart();
    }
    const edge = findFlowEdge(source, from, to, label);
    if (!edge) {
        return { ok: false, reason: 'not-found' };
    }
    const map = readLinkStyleMap(source);
    const decls = applyStrokePatch(map.get(edge.index) ?? {}, patch, 'edge');
    if (Object.keys(decls).length) {
        map.set(edge.index, decls);
    }
    else {
        map.delete(edge.index);
    }
    const next = writeLinkStyleMap(source, map);
    if (next === source) {
        return unchanged(source);
    }
    return { ok: true, source: next, changed: true };
}

export function readNodeStroke(source: string, id: string): ElementStroke {
    return strokeFromDecls(readNodeStyleDecls(source, id), 'fill');
}

export function readEdgeStroke(source: string, from: string, to: string, label?: string): ElementStroke {
    return strokeFromDecls(readEdgeStyleDecls(source, from, to, label), 'stroke');
}

export function setNodeShape(source: string, id: string, shape: NodeShape, extra: WrapShapeExtra = {}): PatchResult {
    if (classifyMermaidSource(source) !== 'flowchart') {
        return notFlowchart();
    }
    const def = findNodeDefinition(source, id);
    if (!def) {
        return { ok: false, reason: 'not-found' };
    }
    const label = def.label || id;
    const parts = wrapShape(id, label, shape, extra).split('\n');
    const head = parts[0]!;
    const indent = def.lineText.slice(0, def.idStart);
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    lines[def.line] = indent + head + def.lineText.slice(def.tokenEnd);
    if (isTextShapeCompanion(lines[def.line + 1], id)) {
        lines.splice(def.line + 1, 1);
    }
    const companions = parts.slice(1).map((part) => indent + part.trimStart());
    if (companions.length) {
        lines.splice(def.line + 1, 0, ...companions);
    }
    const next = lines.join('\n');
    if (next === source) {
        return unchanged(source);
    }
    return { ok: true, source: next, changed: true };
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

function isTextShapeCompanion(line: string | undefined, id: string): boolean {
    if (!line) {
        return false;
    }
    const clean = lineWithoutComment(line).trim();
    return new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*@\\{\\s*shape:\\s*text\\s*\\}\\s*$`).test(clean);
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

function isShapeToken(token: { id: string; raw: string; }): boolean {
    return token.raw.length > token.id.length;
}

function keptEndpointLines(edge: FlowEdgeSpan): string[] {
    const { stmt } = edge;
    const lines: string[] = [];
    if (isShapeToken(stmt.left)) {
        lines.push(`${stmt.indent}${stmt.left.raw}`);
    }
    if (stmt.right && isShapeToken(stmt.right)) {
        lines.push(`${stmt.indent}${stmt.right.raw}`);
    }
    return lines;
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
