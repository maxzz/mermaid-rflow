import { lineWithoutComment } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { collectFlowEdges, readNodeLabel } from '@/components/2-main/2-editor-page/2-panel-diagrams/1-mmd/3-catalog/1-flowchart-source';
import { type CssDecls } from '@/components/2-main/2-editor-page/2-panel-diagrams/1-mmd/3-catalog/6-mmd-style';

export type StyleDirectiveKind = 'style' | 'linkStyle';

export type StyleDirectiveLine = {
    kind: StyleDirectiveKind;
    indent: string;
    targetsRaw: string;
    ids: string[];
    indices: number[];
    isDefault: boolean;
    interpolate?: string;
    decls: CssDecls;
    comment: string;
};

export type ResolvedStyleTarget = {
    id: string;
    label: string;
};

export type ResolvedStyleDirective = {
    heading: string;
    summary: string;
    targets: ResolvedStyleTarget[];
};

export type StyleFieldKind = 'color' | 'width' | 'dash' | 'text';

export type StyleFieldSpec = {
    key: string;
    label: string;
    hint: string;
    kind: StyleFieldKind;
};

/** CSS properties Mermaid documents and commonly accepts on `style` lines. */
export const NODE_STYLE_FIELDS: StyleFieldSpec[] = [
    { key: 'fill', label: 'Fill', hint: 'Node background color.', kind: 'color' },
    { key: 'stroke', label: 'Stroke', hint: 'Node border color.', kind: 'color' },
    { key: 'color', label: 'Text', hint: 'Label text color.', kind: 'color' },
    { key: 'stroke-width', label: 'Width', hint: 'Border thickness.', kind: 'width' },
    { key: 'stroke-dasharray', label: 'Dash', hint: 'Border dash pattern. Use spaces, or escape commas as \\,.', kind: 'dash' },
    { key: 'opacity', label: 'Opacity', hint: 'Overall node opacity (0–1).', kind: 'text' },
    { key: 'fill-opacity', label: 'Fill opacity', hint: 'Background opacity (0–1).', kind: 'text' },
    { key: 'stroke-opacity', label: 'Stroke opacity', hint: 'Border opacity (0–1).', kind: 'text' },
    { key: 'font-size', label: 'Font size', hint: 'Label size, for example 14px.', kind: 'text' },
    { key: 'font-weight', label: 'Font weight', hint: 'Label weight: normal, bold, or 100–900.', kind: 'text' },
    { key: 'font-family', label: 'Font family', hint: 'Label typeface.', kind: 'text' },
    { key: 'rx', label: 'Radius X', hint: 'Horizontal corner radius for rectangular nodes.', kind: 'text' },
    { key: 'ry', label: 'Radius Y', hint: 'Vertical corner radius for rectangular nodes.', kind: 'text' },
];

/** CSS properties Mermaid documents and commonly accepts on `linkStyle` lines. */
export const LINK_STYLE_FIELDS: StyleFieldSpec[] = [
    { key: 'stroke', label: 'Stroke', hint: 'Link color.', kind: 'color' },
    { key: 'color', label: 'Label', hint: 'Edge label color.', kind: 'color' },
    { key: 'fill', label: 'Fill', hint: 'Arrowhead or fill color. Often none.', kind: 'color' },
    { key: 'stroke-width', label: 'Width', hint: 'Link thickness.', kind: 'width' },
    { key: 'stroke-dasharray', label: 'Dash', hint: 'Link dash pattern. Use spaces, or escape commas as \\,.', kind: 'dash' },
    { key: 'opacity', label: 'Opacity', hint: 'Overall link opacity (0–1).', kind: 'text' },
];

export const LINK_INTERPOLATE_TYPES = [
    'linear',
    'basis',
    'cardinal',
    'monotone',
    'natural',
    'step',
    'step-after',
    'step-before',
] as const;

export const DASH_DASHED = '8 4';
export const DASH_DOTTED = '2 3';

const STYLE_HEAD = /^(\s*)(style|linkStyle)\b(.*)$/i;
const STYLE_IDS = /^((?:default|[A-Za-z][\w-]*)(?:\s*,\s*(?:default|[A-Za-z][\w-]*))*)(?:\s+(.*))?$/;
const LINK_DEFAULT = /^default\b/i;
const LINK_INDICES = /^\d+(?:\s*,\s*\d+)*/;
const LINK_INTERPOLATE = /^interpolate\s+(\S+)/i;

export function parseStyleDirectiveLine(line: string): StyleDirectiveLine | null {
    const code = lineWithoutComment(line).trimEnd();
    const comment = line.slice(code.length);
    const match = code.match(STYLE_HEAD);
    if (!match) {
        return null;
    }
    const indent = match[1] ?? '';
    const kind: StyleDirectiveKind = match[2]!.toLowerCase() === 'linkstyle' ? 'linkStyle' : 'style';
    const body = (match[3] ?? '').trim();
    const parsed = kind === 'style' ? parseStyleBody(body) : parseLinkStyleBody(body);
    if (!parsed) {
        return null;
    }
    return { kind, indent, comment, ...parsed };
}

export function formatStyleDirectiveLine(line: StyleDirectiveLine): string {
    const interpolate = line.kind === 'linkStyle' && line.interpolate ? ` interpolate ${line.interpolate}` : '';
    const decls = formatLineDecls(line.decls);
    const declsPart = decls ? ` ${decls}` : '';
    return `${line.indent}${line.kind} ${line.targetsRaw}${interpolate}${declsPart}${line.comment}`;
}

export function readStyleDirectiveAt(source: string, lineNumber1: number): { parsed: StyleDirectiveLine; resolved: ResolvedStyleDirective; } | null {
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    const raw = lines[lineNumber1 - 1];
    if (raw == null) {
        return null;
    }
    const parsed = parseStyleDirectiveLine(raw);
    if (!parsed) {
        return null;
    }
    return { parsed, resolved: resolveStyleDirective(source, parsed) };
}

export function resolveStyleDirective(source: string, line: StyleDirectiveLine): ResolvedStyleDirective {
    if (line.kind === 'style') {
        const targets = line.isDefault
            ? [{ id: 'default', label: 'Default' }]
            : line.ids.map((id) => ({ id, label: nodeDisplayName(source, id) }));
        return {
            heading: line.isDefault ? 'Default node style' : 'Node style',
            summary: targets.map((item) => item.label).join(', '),
            targets,
        };
    }
    if (line.isDefault) {
        return {
            heading: 'Default link style',
            summary: 'All links',
            targets: [{ id: 'default', label: 'All links' }],
        };
    }
    const edges = collectFlowEdges(source);
    const targets = line.indices.map((index) => {
        const edge = edges[index];
        if (!edge) {
            return { id: String(index), label: `Link ${index}` };
        }
        const from = readNodeLabel(source, edge.from);
        const to = readNodeLabel(source, edge.to);
        const label = edge.label ? `${from} → ${to} (${edge.label})` : `${from} → ${to}`;
        return { id: String(index), label };
    });
    return {
        heading: 'Link style',
        summary: targets.map((item) => item.label).join(', '),
        targets,
    };
}

export function patchStyleDirectiveAtLine(
    source: string,
    lineNumber1: number,
    patch: (line: StyleDirectiveLine) => StyleDirectiveLine,
): string {
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    const idx = lineNumber1 - 1;
    const raw = lines[idx];
    if (raw == null) {
        return source;
    }
    const parsed = parseStyleDirectiveLine(raw);
    if (!parsed) {
        return source;
    }
    const nextLine = formatStyleDirectiveLine(patch(parsed));
    if (nextLine === raw) {
        return source;
    }
    lines[idx] = nextLine;
    return lines.join('\n');
}

export function setStyleDecl(line: StyleDirectiveLine, key: string, value: string | undefined): StyleDirectiveLine {
    const decls: CssDecls = {};
    let seen = false;
    for (const [k, v] of Object.entries(line.decls)) {
        if (k === key) {
            seen = true;
            if (value) {
                decls[k] = value;
            }
        }
        else {
            decls[k] = v;
        }
    }
    if (!seen && value) {
        decls[key] = value;
    }
    return { ...line, decls };
}

export function setStyleInterpolate(line: StyleDirectiveLine, interpolate: string | undefined): StyleDirectiveLine {
    return { ...line, interpolate: interpolate || undefined };
}

export function extraStyleDecls(line: StyleDirectiveLine, fields: readonly StyleFieldSpec[]): [string, string][] {
    const known = new Set(fields.map((field) => field.key));
    return Object.entries(line.decls).filter(([key]) => !known.has(key));
}

export function fieldsForKind(kind: StyleDirectiveKind): StyleFieldSpec[] {
    return kind === 'style' ? NODE_STYLE_FIELDS : LINK_STYLE_FIELDS;
}

function parseStyleBody(body: string): Omit<StyleDirectiveLine, 'kind' | 'indent' | 'comment'> | null {
    if (!body) {
        return null;
    }
    const match = body.match(STYLE_IDS);
    if (!match?.[1]) {
        return null;
    }
    const targetsRaw = match[1].trim();
    const ids = splitList(targetsRaw);
    if (!ids.length) {
        return null;
    }
    return {
        targetsRaw,
        ids,
        indices: [],
        isDefault: ids.length === 1 && ids[0]!.toLowerCase() === 'default',
        decls: parseLineDecls(match[2] ?? ''),
    };
}

function parseLinkStyleBody(body: string): Omit<StyleDirectiveLine, 'kind' | 'indent' | 'comment'> | null {
    if (!body) {
        return null;
    }
    let remaining = body;
    let targetsRaw = '';
    let isDefault = false;
    let indices: number[] = [];

    const def = remaining.match(LINK_DEFAULT);
    if (def) {
        isDefault = true;
        targetsRaw = remaining.slice(0, def[0].length);
        remaining = remaining.slice(def[0].length).trim();
    }
    else {
        const nums = remaining.match(LINK_INDICES);
        if (!nums) {
            return null;
        }
        targetsRaw = nums[0]!;
        indices = splitList(nums[0]!).map(Number);
        remaining = remaining.slice(nums[0].length).trim();
    }

    let interpolate: string | undefined;
    const interp = remaining.match(LINK_INTERPOLATE);
    if (interp?.[1]) {
        interpolate = interp[1];
        remaining = remaining.slice(interp[0].length).trim();
    }

    return {
        targetsRaw,
        ids: isDefault ? ['default'] : [],
        indices,
        isDefault,
        interpolate,
        decls: parseLineDecls(remaining),
    };
}

function parseLineDecls(raw: string): CssDecls {
    const trimmed = raw.trim().replace(/;+\s*$/, '');
    const out: CssDecls = {};
    for (const part of splitDeclParts(trimmed)) {
        const i = part.indexOf(':');
        if (i < 1) {
            continue;
        }
        const key = part.slice(0, i).trim().toLowerCase();
        const val = part.slice(i + 1).trim();
        if (key && val) {
            out[key] = val;
        }
    }
    return out;
}

function formatLineDecls(decls: CssDecls): string {
    return Object.entries(decls)
        .filter(([, val]) => val)
        .map(([key, val]) => `${key}:${escapeDeclValue(val)}`)
        .join(',');
}

function splitDeclParts(raw: string): string[] {
    const parts: string[] = [];
    let buf = '';
    let depth = 0;
    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i]!;
        if (ch === '\\' && raw[i + 1] === ',') {
            buf += ',';
            i++;
            continue;
        }
        if (ch === '(') {
            depth++;
        }
        else if (ch === ')') {
            depth = Math.max(0, depth - 1);
        }
        if (ch === ',' && depth === 0) {
            parts.push(buf);
            buf = '';
            continue;
        }
        buf += ch;
    }
    if (buf.trim()) {
        parts.push(buf);
    }
    return parts;
}

function escapeDeclValue(val: string): string {
    return val.replace(/,/g, '\\,');
}

function splitList(raw: string): string[] {
    return raw.split(',').map((part) => part.trim()).filter(Boolean);
}

function nodeDisplayName(source: string, id: string): string {
    const label = readNodeLabel(source, id);
    return label && label !== id ? `${id} · ${label}` : id;
}
