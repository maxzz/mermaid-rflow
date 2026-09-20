import { escapeRegExp, lineWithoutComment } from '@/store/6-source-render-links';
import { collectFlowEdges } from './1-flowchart-source';

export type LineDash = 'solid' | 'dashed' | 'dotted';

export type ElementStroke = {
    color: string | null;
    width: number | null;
    dash: LineDash;
};

export type CssDecls = Record<string, string>;

const DEFAULT_STROKE: ElementStroke = { color: null, width: null, dash: 'solid' };

export function parseCssDecls(raw: string): CssDecls {
    const out: CssDecls = {};
    for (const part of raw.split(',')) {
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

export function formatCssDecls(decls: CssDecls): string {
    return Object.entries(decls)
        .filter(([, val]) => val)
        .map(([key, val]) => `${key}:${val}`)
        .join(',');
}

export function strokeFromDecls(decls: CssDecls, colorKey: 'fill' | 'stroke'): ElementStroke {
    const color = normalizeColor(decls[colorKey] || decls.stroke);
    return {
        color,
        width: parseStrokeWidth(decls['stroke-width']),
        dash: parseDash(decls['stroke-dasharray']),
    };
}

export function applyStrokePatch(decls: CssDecls, patch: Partial<ElementStroke>, kind: 'node' | 'edge'): CssDecls {
    const next = { ...decls };
    if (patch.color !== undefined) {
        if (patch.color) {
            if (kind === 'node') {
                next.fill = patch.color;
                next.stroke = patch.color;
            }
            else {
                next.stroke = patch.color;
            }
        }
        else {
            delete next.fill;
            delete next.stroke;
        }
    }
    if (patch.width !== undefined) {
        if (patch.width == null) {
            delete next['stroke-width'];
        }
        else {
            next['stroke-width'] = `${patch.width}px`;
        }
    }
    if (patch.dash !== undefined) {
        const dash = dashArray(patch.dash);
        if (dash) {
            next['stroke-dasharray'] = dash;
        }
        else {
            delete next['stroke-dasharray'];
        }
    }
    return next;
}

export function readNodeStyleDecls(source: string, id: string): CssDecls {
    const re = styleLineRe(id);
    for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
        const clean = lineWithoutComment(line).trim();
        const match = clean.match(re);
        if (match?.[1]) {
            return parseCssDecls(match[1]);
        }
    }
    return {};
}

export function upsertNodeStyleLine(source: string, id: string, decls: CssDecls): string {
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    const re = new RegExp(`^\\s*style\\s+${escapeRegExp(id)}(?:\\s|$)`, 'i');
    const formatted = formatCssDecls(decls);
    const idx = lines.findIndex((line) => re.test(lineWithoutComment(line)));
    if (!formatted) {
        if (idx >= 0) {
            lines.splice(idx, 1);
        }
        return lines.join('\n');
    }
    const nextLine = `    style ${id} ${formatted}`;
    if (idx >= 0) {
        lines[idx] = nextLine;
    }
    else {
        return appendUtilityLine(lines.join('\n'), nextLine);
    }
    return lines.join('\n');
}

export function removeNodeStyleLine(source: string, id: string): string {
    const re = new RegExp(`^\\s*style\\s+${escapeRegExp(id)}(?:\\s|$)`, 'i');
    return source.replace(/\r\n/g, '\n').split('\n').filter((line) => !re.test(lineWithoutComment(line))).join('\n');
}

export function readLinkStyleMap(source: string): Map<number, CssDecls> {
    const map = new Map<number, CssDecls>();
    for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
        const match = lineWithoutComment(line).trim().match(/^linkStyle\s+([\d,\s]+)\s+(.+)$/i);
        if (!match?.[1] || !match[2]) {
            continue;
        }
        const decls = parseCssDecls(match[2]);
        for (const part of match[1].split(',')) {
            const index = Number(part.trim());
            if (Number.isInteger(index)) {
                map.set(index, { ...map.get(index), ...decls });
            }
        }
    }
    return map;
}

export function stripLinkStyleLines(source: string): string {
    return source.replace(/\r\n/g, '\n').split('\n').filter((line) => !/^\s*linkStyle\b/i.test(lineWithoutComment(line))).join('\n');
}

export function writeLinkStyleMap(source: string, map: Map<number, CssDecls>): string {
    const stripped = stripLinkStyleLines(source);
    const lines = [...map.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([index, decls]) => {
            const formatted = formatCssDecls(decls);
            return formatted ? `    linkStyle ${index} ${formatted}` : '';
        })
        .filter(Boolean);
    if (!lines.length) {
        return stripped;
    }
    return appendUtilityLine(stripped, lines.join('\n'));
}

export function restyleLinksByIdentity(before: string, after: string): string {
    const beforeEdges = collectFlowEdges(before);
    const afterEdges = collectFlowEdges(after);
    const styles = readLinkStyleMap(before);
    const next = new Map<number, CssDecls>();
    for (const [index, decls] of styles) {
        const edge = beforeEdges[index];
        if (!edge) {
            continue;
        }
        const found = afterEdges.find((item) => item.from === edge.from && item.to === edge.to && item.label === edge.label);
        if (found) {
            next.set(found.index, decls);
        }
    }
    return writeLinkStyleMap(after, next);
}

export function readEdgeStyleDecls(source: string, from: string, to: string, label?: string): CssDecls {
    const edge = collectFlowEdges(source).find((item) => item.from === from && item.to === to && (label ? item.label === label : true));
    if (!edge) {
        return {};
    }
    return readLinkStyleMap(source).get(edge.index) ?? {};
}

function styleLineRe(id: string): RegExp {
    return new RegExp(`^style\\s+${escapeRegExp(id)}\\s+(.+)$`, 'i');
}

function appendUtilityLine(source: string, line: string): string {
    const base = source.endsWith('\n') || source === '' ? source : `${source}\n`;
    return `${base}${line}\n`;
}

function parseStrokeWidth(raw: string | undefined): number | null {
    if (!raw) {
        return null;
    }
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : null;
}

function parseDash(raw: string | undefined): LineDash {
    if (!raw || raw === 'none' || raw === '0') {
        return 'solid';
    }
    const first = Number.parseFloat(raw);
    if (Number.isFinite(first) && first <= 3) {
        return 'dotted';
    }
    return 'dashed';
}

function dashArray(dash: LineDash): string | undefined {
    switch (dash) {
        case 'dashed':
            return '8 4';
        case 'dotted':
            return '2 3';
        default:
            return undefined;
    }
}

function normalizeColor(raw: string | undefined): string | null {
    if (!raw) {
        return null;
    }
    const value = raw.trim();
    const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (!hex) {
        return value;
    }
    if (hex[1]!.length === 3) {
        const [r, g, b] = hex[1]!;
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return `#${hex[1]!.toLowerCase()}`;
}

export { DEFAULT_STROKE };
