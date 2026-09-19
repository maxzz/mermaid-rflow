import { findToken, lineWithoutComment } from '@/store/6-source-render-links';

export type FlowDirection = 'TD' | 'TB' | 'BT' | 'LR' | 'RL';
export const NODE_SHAPES = [
    'rect',
    'diamond',
    'stadium',
    'circle',
    'text',
    'rounded',
    'hex',
    'cyl',
    'cloud',
    'doc',
    'fr-rect',
    'dbl-circ',
    'lean-r',
    'trap-b',
    'image',
    'icon',
    'video',
] as const;
export type NodeShape = typeof NODE_SHAPES[number];
export type SourceKind = 'empty' | 'flowchart' | 'other';
export type WrapShapeExtra = {
    src?: string;
    icon?: string;
};

export const FLOW_SHAPE_ITEMS: { value: NodeShape; label: string; }[] = [
    { value: 'text', label: 'Text' },
    { value: 'rect', label: 'Rectangle' },
    { value: 'rounded', label: 'Rounded' },
    { value: 'stadium', label: 'Stadium' },
    { value: 'circle', label: 'Circle' },
    { value: 'diamond', label: 'Diamond' },
    { value: 'hex', label: 'Hexagon' },
    { value: 'cyl', label: 'Cylinder' },
    { value: 'cloud', label: 'Cloud' },
    { value: 'doc', label: 'Document' },
    { value: 'fr-rect', label: 'Subroutine' },
    { value: 'dbl-circ', label: 'Double circle' },
    { value: 'lean-r', label: 'Lean right' },
    { value: 'trap-b', label: 'Trapezoid' },
];

export type FlowHeader =
    | { kind: 'empty'; }
    | { kind: 'other'; }
    | { kind: 'flowchart'; prefix: string; declaration: string; body: string; };

const FLOWCHART_DECL = /^(flowchart|graph)\b/i;
const DIR_TOKEN = /\b(TD|TB|BT|LR|RL)\b/i;
const BARE_ID = /^[A-Za-z][\w-]*$/;

const KEYWORDS = new Set([
    'graph',
    'flowchart',
    'subgraph',
    'end',
    'classdef',
    'class',
    'click',
    'style',
    'linkstyle',
    'direction',
    'td',
    'tb',
    'bt',
    'lr',
    'rl',
]);

export function classifyMermaidSource(source: string): SourceKind {
    return extractHeader(source).kind;
}

export function extractHeader(source: string): FlowHeader {
    let rest = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    if (!rest.trim()) {
        return { kind: 'empty' };
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

    const nl = rest.indexOf('\n');
    const firstLine = (nl === -1 ? rest : rest.slice(0, nl)).trim();
    const body = nl === -1 ? '' : rest.slice(nl + 1);
    if (!firstLine) {
        return prefix.trim() ? { kind: 'other' } : { kind: 'empty' };
    }
    if (FLOWCHART_DECL.test(firstLine)) {
        return { kind: 'flowchart', prefix, declaration: firstLine, body };
    }
    return { kind: 'other' };
}

export function rebuildSource(header: Extract<FlowHeader, { kind: 'flowchart'; }>, declaration = header.declaration, body = header.body): string {
    return `${header.prefix}${declaration}\n${body}`;
}

export function readDirection(source: string): FlowDirection | null {
    const header = extractHeader(source);
    if (header.kind !== 'flowchart') {
        return null;
    }
    const match = header.declaration.match(DIR_TOKEN);
    const raw = match?.[1]?.toUpperCase();
    if (raw === 'TB') {
        return 'TD';
    }
    if (raw === 'TD' || raw === 'BT' || raw === 'LR' || raw === 'RL') {
        return raw;
    }
    return 'TD';
}

export function collectFlowchartIds(source: string): Set<string> {
    const ids = new Set<string>();
    const header = extractHeader(source);
    if (header.kind !== 'flowchart') {
        return ids;
    }
    const text = `${header.declaration}\n${header.body}`;
    for (const line of text.split('\n')) {
        const clean = lineWithoutComment(line).replace(/@\{[\s\S]*?\}/g, ' ');
        const re = /[A-Za-z][\w-]*/g;
        let match: RegExpExecArray | null;
        while ((match = re.exec(clean))) {
            const id = match[0]!;
            if (!KEYWORDS.has(id.toLowerCase())) {
                ids.add(id);
            }
        }
    }
    return ids;
}

export function nextMermaidId(source: string, prefix: 'n' | 'd' | 's' | 'c'): string {
    const used = collectFlowchartIds(source);
    let i = 1;
    while (used.has(`${prefix}${i}`)) {
        i += 1;
    }
    return `${prefix}${i}`;
}

export function prefixForShape(shape: NodeShape): 'n' | 'd' | 's' | 'c' {
    switch (shape) {
        case 'diamond':
            return 'd';
        case 'stadium':
            return 's';
        case 'circle':
            return 'c';
        default:
            return 'n';
    }
}

export function wrapShape(id: string, label: string, shape: NodeShape, extra: WrapShapeExtra = {}): string {
    const inner = formatShapeInner(label);
    if (shape === 'image' || (shape === 'video' && extra.src && mediaAsImage(extra.src))) {
        const url = shape === 'video' ? (youtubeThumbUrl(extra.src ?? '') ?? extra.src ?? '') : (extra.src ?? '');
        const width = shape === 'video' ? 160 : 120;
        if (url) {
            return `${id}@{ img: "${escapeAttr(url)}", w: ${width}, label: ${quotedLabel(label)} }`;
        }
        return `${id}@{ shape: notch-rect, label: ${quotedLabel(label)} }`;
    }
    if (shape === 'video') {
        return `${id}@{ shape: browser, label: ${quotedLabel(label)} }`;
    }
    if (shape === 'icon') {
        const icon = extra.icon?.trim() || 'fa:fa-star';
        const text = label.trim() ? `${icon} ${label.trim()}` : icon;
        return `${id}[${quotedLabel(text)}]`;
    }
    if (shape === 'text') {
        return `${id}[${quotedLabel(label)}]\n    ${id}@{ shape: text }`;
    }
    switch (shape) {
        case 'diamond':
            return `${id}{${inner}}`;
        case 'circle':
            return `${id}((${inner}))`;
        case 'stadium':
            return `${id}([${inner}])`;
        case 'rect':
            return `${id}[${inner}]`;
        default:
            return `${id}@{ shape: ${shape}, label: ${quotedLabel(label)} }`;
    }
}

export function defaultLabelFor(shape: NodeShape): string {
    switch (shape) {
        case 'text':
            return 'Text Block';
        case 'image':
            return 'Image';
        case 'video':
            return 'Video';
        case 'icon':
            return 'Icon';
        default:
            return 'New';
    }
}

export function youtubeThumbUrl(src: string): string | null {
    const match = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
    return match?.[1] ? `https://i.ytimg.com/vi/${match[1]}/mqdefault.jpg` : null;
}

function mediaAsImage(src: string): boolean {
    return Boolean(youtubeThumbUrl(src) || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(src) || src.startsWith('data:image/'));
}

function quotedLabel(label: string): string {
    return `"${escapeLabel(label)}"`;
}

function escapeAttr(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '%22');
}

export function formatShapeInner(label: string): string {
    if (!needsQuotes(label)) {
        return label;
    }
    return `"${escapeLabel(label)}"`;
}

function needsQuotes(label: string): boolean {
    return label === '' || /[[\](){}|#;"'\n]/.test(label) || label !== label.trim();
}

export function escapeLabel(label: string): string {
    return label.replace(/\r\n/g, '\n').replace(/\n/g, '<br/>').replace(/"/g, '#quot;');
}

export type NodeDefSpan = {
    line: number;
    lineText: string;
    idStart: number;
    idEnd: number;
    label: string;
    labelStart: number;
    labelEnd: number;
    shape: NodeShape | 'other';
    atClose?: number;
};

export function findNodeDefinition(source: string, id: string): NodeDefSpan | null {
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const clean = lineWithoutComment(line);
        const token = findToken(clean, id);
        if (!token) {
            continue;
        }
        const after = clean.slice(token.end);
        if (!/^\s*(?:[\[\(\{>]|@\{)/.test(after) && !/^\s*subgraph\s+$/i.test(clean.slice(0, token.start))) {
            continue;
        }
        const shape = parseShapeAfterId(clean, token.end);
        if (!shape) {
            continue;
        }
        return {
            line: i,
            lineText: line,
            idStart: token.start,
            idEnd: token.end,
            label: shape.label,
            labelStart: shape.labelStart,
            labelEnd: shape.labelEnd,
            shape: shape.shape,
            atClose: shape.atClose,
        };
    }
    return null;
}

export function readNodeLabel(source: string, id: string): string {
    return findNodeDefinition(source, id)?.label ?? id;
}

export type NodeToken = {
    id: string;
    raw: string;
    start: number;
    end: number;
};

export type FlowStmt = {
    indent: string;
    left: NodeToken;
    arrow: { raw: string; start: number; end: number; } | null;
    right: NodeToken | null;
};

const ARROW_RE = /-\.->|==>|-->|---|-\.-/;

export function parseFlowStmt(line: string): FlowStmt | null {
    const clean = lineWithoutComment(line);
    if (!clean.trim() || clean.trimStart().startsWith('%%')) {
        return null;
    }
    if (/^\s*(subgraph|end|classDef|class|click|style|linkStyle|direction)\b/i.test(clean)) {
        return null;
    }
    const indentMatch = clean.match(/^[ \t]*/);
    const indent = indentMatch?.[0] ?? '';
    const left = parseNodeToken(clean, indent.length);
    if (!left || !BARE_ID.test(left.id)) {
        return null;
    }
    const afterLeft = skipWs(clean, left.end);
    const arrow = matchArrow(clean, afterLeft);
    if (!arrow) {
        return { indent, left, arrow: null, right: null };
    }
    const afterArrow = skipWs(clean, arrow.end);
    const right = parseNodeToken(clean, afterArrow);
    if (!right) {
        return { indent, left, arrow, right: null };
    }
    return { indent, left, arrow, right };
}

export function isFlowchartDiagramType(diagramType: string | null | undefined): boolean {
    if (!diagramType) {
        return false;
    }
    return diagramType === 'flowchart' || diagramType === 'flowchart-v2' || diagramType === 'flowchart-elk' || diagramType === 'graph';
}

function parseNodeToken(text: string, start: number): NodeToken | null {
    const idMatch = text.slice(start).match(/^[A-Za-z][\w-]*/);
    if (!idMatch) {
        return null;
    }
    const id = idMatch[0]!;
    const idEnd = start + id.length;
    const shape = parseShapeAfterId(text, idEnd);
    return {
        id,
        raw: text.slice(start, shape?.end ?? idEnd),
        start,
        end: shape?.end ?? idEnd,
    };
}

function parseShapeAfterId(text: string, idEnd: number): { label: string; labelStart: number; labelEnd: number; shape: NodeShape | 'other'; end: number; atClose?: number; } | null {
    let i = skipWs(text, idEnd);
    if (text[i] === '@' && text[i + 1] === '{') {
        return parseAtShape(text, i);
    }
    const open = text.slice(i, i + 2);
    if (open === '((') {
        return closePair(text, i, '((', '))', 'circle');
    }
    if (open === '([') {
        return closePair(text, i, '([', '])', 'stadium');
    }
    if (open === '[[') {
        return closePair(text, i, '[[', ']]', 'other');
    }
    if (open === '[(') {
        return closePair(text, i, '[(', ')]', 'other');
    }
    if (open === '{{') {
        return closePair(text, i, '{{', '}}', 'other');
    }
    const ch = text[i];
    if (ch === '[') {
        return closePair(text, i, '[', ']', 'rect');
    }
    if (ch === '{') {
        return closePair(text, i, '{', '}', 'diamond');
    }
    if (ch === '(') {
        return closePair(text, i, '(', ')', 'other');
    }
    if (ch === '>') {
        const close = text.indexOf(']', i + 1);
        if (close < 0) {
            return null;
        }
        return {
            label: unquote(text.slice(i + 1, close)),
            labelStart: i + 1,
            labelEnd: close,
            shape: 'other',
            end: close + 1,
        };
    }
    return null;
}

function parseAtShape(text: string, start: number): { label: string; labelStart: number; labelEnd: number; shape: NodeShape | 'other'; end: number; atClose?: number; } | null {
    const brace = readAtBrace(text, start);
    if (!brace) {
        return null;
    }
    const bodyStart = start + 2;
    const shapeMatch = brace.body.match(/\bshape\s*:\s*([A-Za-z][\w-]*)/);
    const labelMatch = brace.body.match(/\blabel\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s,}]+)/);
    const shapeName = shapeMatch?.[1] ?? '';
    const shape: NodeShape | 'other' = isNodeShape(shapeName) ? shapeName : 'other';
    if (labelMatch && labelMatch.index != null) {
        const raw = labelMatch[1]!;
        const rawStart = bodyStart + labelMatch.index + labelMatch[0]!.length - raw.length;
        return {
            label: unquote(raw.replace(/\\"/g, '"')),
            labelStart: rawStart,
            labelEnd: rawStart + raw.length,
            shape,
            end: brace.end,
            atClose: brace.end - 1,
        };
    }
    return {
        label: '',
        labelStart: brace.end - 1,
        labelEnd: brace.end - 1,
        shape,
        end: brace.end,
        atClose: brace.end - 1,
    };
}

function readAtBrace(text: string, start: number): { body: string; end: number; } | null {
    if (text[start] !== '@' || text[start + 1] !== '{') {
        return null;
    }
    let depth = 1;
    let quote: '"' | "'" | null = null;
    for (let i = start + 2; i < text.length; i++) {
        const ch = text[i]!;
        if (quote) {
            if (ch === quote && text[i - 1] !== '\\') {
                quote = null;
            }
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            continue;
        }
        if (ch === '{') {
            depth += 1;
        }
        else if (ch === '}') {
            depth -= 1;
            if (depth === 0) {
                return { body: text.slice(start + 2, i), end: i + 1 };
            }
        }
    }
    return null;
}

function isNodeShape(value: string): value is NodeShape {
    return (NODE_SHAPES as readonly string[]).includes(value);
}

function closePair(text: string, start: number, open: string, close: string, shape: NodeShape | 'other') {
    const innerStart = start + open.length;
    if (text[innerStart] === '"') {
        const quoted = readQuoted(text, innerStart);
        if (!quoted) {
            return null;
        }
        const afterQuote = quoted.end + 1;
        if (text.slice(afterQuote, afterQuote + close.length) !== close) {
            return null;
        }
        return {
            label: unquote(text.slice(innerStart, afterQuote)),
            labelStart: innerStart,
            labelEnd: afterQuote,
            shape,
            end: afterQuote + close.length,
        };
    }
    const end = text.indexOf(close, innerStart);
    if (end < 0) {
        return null;
    }
    return {
        label: unquote(text.slice(innerStart, end)),
        labelStart: innerStart,
        labelEnd: end,
        shape,
        end: end + close.length,
    };
}

function readQuoted(text: string, start: number): { end: number; } | null {
    if (text[start] !== '"') {
        return null;
    }
    for (let i = start + 1; i < text.length; i++) {
        if (text[i] === '"') {
            return { end: i };
        }
    }
    return null;
}

function unquote(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1).replace(/#quot;/g, '"');
    }
    return raw;
}

function matchArrow(text: string, start: number): { raw: string; start: number; end: number; } | null {
    const rest = text.slice(start);
    const arrow = rest.match(ARROW_RE);
    if (!arrow || arrow.index !== 0) {
        return null;
    }
    let end = start + arrow[0].length;
    const labeled = text.slice(end).match(/^\s*\|[^|]*\|/);
    if (labeled) {
        end += labeled[0].length;
    }
    return { raw: text.slice(start, end), start, end };
}

function skipWs(text: string, i: number): number {
    while (i < text.length && (text[i] === ' ' || text[i] === '\t')) {
        i += 1;
    }
    return i;
}
