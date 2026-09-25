import { type Edge, type Node } from 'reactflow';
import { mermaidIdFromEndpoint, mermaidIdOf, isSubgraphNode } from './8-mermaid-ids';

//Serialize a React Flow graph back to Mermaid flowchart text. Positions, colors, icons, and images are canvas-only and are not emitted.

export type SerializeResult =
    | { ok: true; mermaid: string }
    | { ok: false; reason: 'not-flowchart' };

export function reactFlowToMermaid(nodes: Node[], edges: Edge[], currentSource: string): SerializeResult {
    const header = extractHeader(currentSource);
    if (header === 'other') {
        return { ok: false, reason: 'not-flowchart' };
    }

    const declaration = header === 'empty' ? 'graph TD' : header.declaration;
    const prefix = header === 'empty' ? '' : header.prefix;

    const nodeIds = new Set(nodes.map((n) => n.id));
    const bodyLines = [
        ...emitNodes(nodes, undefined, nodeIds, ''),
        ...edges
            .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
            .map((edge) => `    ${formatEdge(edge)}`),
    ];

    const chunks: string[] = [];
    const trimmedPrefix = prefix.replace(/\s+$/, '');
    if (trimmedPrefix) {
        chunks.push(trimmedPrefix);
    }
    chunks.push(declaration);
    if (bodyLines.length) {
        chunks.push(bodyLines.join('\n'));
    }
    return { ok: true, mermaid: `${chunks.join('\n')}\n` };
}

//---------------------------------------------------------------------------
// Extract a flowchart declaration from a Mermaid source.

export function extractHeader(source: string): { prefix: string; declaration: string } | 'empty' | 'other' {
    let rest = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    if (!rest.trim()) {
        return 'empty';
    }

    let prefix = '';

    const yaml = rest.match(/^---\n[\s\S]*?\n---\n?/);
    if (yaml) {
        prefix += yaml[0];
        rest = rest.slice(yaml[0].length);
    }

    while (true) {
        const init = rest.match(/^\s*%%\{[\s\S]*?\}%%[^\n]*\n?/);
        if (init) {
            prefix += init[0];
            rest = rest.slice(init[0].length);
            continue;
        }
        const comment = rest.match(/^\s*%%[^\n]*\n/);
        if (comment) {
            prefix += comment[0];
            rest = rest.slice(comment[0].length);
            continue;
        }
        const blank = rest.match(/^[ \t]*\n/);
        if (blank) {
            prefix += blank[0];
            rest = rest.slice(blank[0].length);
            continue;
        }
        break;
    }

    const firstLine = (rest.match(/^[^\n]*/) ?? [''])[0]!.trim();
    if (!firstLine) {
        return prefix.trim() ? 'other' : 'empty';
    }
    if (FLOWCHART_DECL.test(firstLine)) {
        return { prefix, declaration: firstLine };
    }
    return 'other';
}

const FLOWCHART_DECL = /^(flowchart|graph)\b/i;

function emitNodes(nodes: Node[], parentRfId: string | undefined, ids: Set<string>, indent: string): string[] {
    const children = nodes.filter((n) => parentOf(n, ids) === parentRfId);
    const lines: string[] = [];
    const innerIndent = indent ? `${indent}    ` : '    ';

    for (const child of children) {
        if (isSubgraphNode(child)) {
            const id = mermaidIdOf(child);
            const title = nodeLabel(child);
            const titlePart = title && title !== id ? ` [${formatShapeInner(title)}]` : '';
            lines.push(`${innerIndent}subgraph ${id}${titlePart}`);
            lines.push(...emitNodes(nodes, child.id, ids, innerIndent));
            lines.push(`${innerIndent}end`);
        }
        else {
            lines.push(`${innerIndent}${wrapShape(mermaidIdOf(child), nodeLabel(child), nodeShape(child))}`);
        }
    }
    return lines;
}

function parentOf(node: Node, ids: Set<string>): string | undefined {
    const parent = node.parentNode;
    if (!parent || !ids.has(parent)) {
        return undefined;
    }
    return parent;
}

function nodeLabel(node: Node): string {
    const label = node.data?.label;
    if (label == null || String(label) === '') {
        return mermaidIdOf(node);
    }
    return String(label);
}

function nodeShape(node: Node): string {
    if (node.type === 'diamond' || node.data?.shape === 'diamond') {
        return 'diamond';
    }
    const shape = node.data?.shape;
    if (shape === 'circle' || shape === 'stadium' || shape === 'round' || shape === 'rect') {
        return shape;
    }
    return 'rect';
}

function wrapShape(id: string, label: string, shape: string): string {
    const inner = formatShapeInner(label);
    switch (shape) {
        case 'diamond':
            return `${id}{${inner}}`;
        case 'circle':
            return `${id}((${inner}))`;
        case 'stadium':
            return `${id}([${inner}])`;
        case 'round':
            return `${id}(${inner})`;
        default:
            return `${id}[${inner}]`;
    }
}

function formatShapeInner(label: string): string {
    if (!needsQuotes(label)) {
        return label;
    }
    return `"${escapeLabel(label)}"`;
}

function needsQuotes(label: string): boolean {
    return label === '' || /[[\](){}|#;"'\n]/.test(label) || label !== label.trim();
}

function escapeLabel(label: string): string {
    return label.replace(/\r\n/g, '\n').replace(/\n/g, '<br/>').replace(/"/g, '#quot;');
}

//---------------------------------------------------------------------------
// Format an edge.

function formatEdge(edge: Edge): string {
    const from = mermaidIdFromEndpoint(edge.source);
    const to = mermaidIdFromEndpoint(edge.target);
    const op = normalizeOp(typeof edge.data?.mermaidType === 'string' ? edge.data.mermaidType : undefined);
    const rawLabel = edge.label == null ? '' : String(edge.label);
    if (!rawLabel) {
        return `${from} ${op} ${to}`;
    }
    return `${from} ${op}|${formatEdgeLabel(rawLabel)}| ${to}`;
}

function formatEdgeLabel(label: string): string {
    if (/[|"]/.test(label) || label !== label.trim() || /[[\](){}#\n]/.test(label)) {
        return `"${escapeLabel(label)}"`;
    }
    return label;
}

function normalizeOp(raw: string | undefined): string {
    if (!raw) {
        return '-->';
    }
    return MERMAID_OPS[raw] ?? '-->';
}

const MERMAID_OPS: Record<string, string> = {
    '->': '-->',
    '-->': '-->',
    '->>': '-->',
    '---': '---',
    '-.-': '-.->',
    '-.->': '-.->',
    '==>': '==>',
    '===>': '==>',
    '===': '==>',
};

//---------------------------------------------------------------------------

export function classifyMermaidSource(source: string): 'empty' | 'flowchart' | 'other' {
    const header = extractHeader(source);
    if (header === 'empty') {
        return 'empty';
    }
    if (header === 'other') {
        return 'other';
    }
    return 'flowchart';
}
