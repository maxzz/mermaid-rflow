/**
 * Make exported SVG self-contained for viewers that do not support CSS
 * variables, color-mix(), or oklch() (Windows Photos, older browsers, etc.).
 *
 * Derived paints (--_line, --_text, …) are mixed from --bg/--fg using the same
 * weights as beautiful-mermaid. Optional vars set to `initial` (to avoid
 * inheriting shadcn tokens) are treated as unset — otherwise they flatten to
 * black and vanish on dark palettes.
 */

export type SvgExportProcess = {
    flattenColors: boolean;
    includeFontImport: boolean;
};

/** Innermost CSS color functions (no nested parentheses). `color-mix` / `oklch` before `color` / `lch`. */
const INNERMOST_COLOR_FN = /(?:color-mix|oklch|oklab|hwb|lch|lab|color|var)\([^()]*\)/gi;

const NEEDS_FLATTEN = /var\(|color-mix\(|oklch\(|oklab\(|hwb\(|\blch\(|\blab\(|\bcolor\(/i;

const CSS_WIDE = /^(initial|unset|inherit|revert)$/i;

const FONT_IMPORT_RE = /[ \t]*@import url\([^)]+\);\s*/g;

/**
 * Weights match beautiful-mermaid `MIX` in theme.ts. When an optional
 * enrichment var is unset, derived paints mix --fg into --bg at these %.
 */
export const MIX = {
    textSec: 60,
    textMuted: 40,
    textFaint: 25,
    line: 50,
    arrow: 85,
    nodeFill: 3,
    nodeStroke: 20,
    groupHeader: 5,
    innerStroke: 12,
    keyBadge: 10,
} as const;

/**
 * Replace nested CSS color functions innermost-first using `resolve`.
 * `resolve` must return a value without color functions, or the original expr
 * to leave it unchanged.
 */
export function rewriteCssColorFunctions(text: string, resolve: (expr: string) => string): string {
    let current = text;
    for (let pass = 0; pass < 24; pass++) {
        INNERMOST_COLOR_FN.lastIndex = 0;
        if (!INNERMOST_COLOR_FN.test(current)) {
            break;
        }
        INNERMOST_COLOR_FN.lastIndex = 0;
        let changed = false;
        current = current.replace(INNERMOST_COLOR_FN, (expr) => {
            const next = resolve(expr);
            if (next && next !== expr) {
                changed = true;
                return next;
            }
            return expr;
        });
        if (!changed) {
            break;
        }
    }
    return current;
}

/** Convert any CSS color the current browser understands to #rrggbb or rgba(). */
export function cssColorToSrgb(color: string): string {
    const parsed = parseRgb(color);
    if (parsed && parsed.a >= 1) {
        return rgbToHex(parsed.r, parsed.g, parsed.b);
    }
    if (parsed && parsed.a <= 0) {
        return 'transparent';
    }
    if (parsed) {
        return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${+parsed.a.toFixed(3)})`;
    }

    const trimmed = color.trim();
    if (!trimmed || trimmed === 'none' || CSS_WIDE.test(trimmed)) {
        return trimmed;
    }
    if (trimmed === 'transparent') {
        return 'transparent';
    }
    if (typeof document === 'undefined') {
        return trimmed;
    }

    const ctx = getColorCtx();
    if (!ctx) {
        return trimmed;
    }

    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000000';
    ctx.fillStyle = trimmed;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) {
        return 'transparent';
    }
    if (a === 255) {
        return rgbToHex(r, g, b);
    }
    return `rgba(${r}, ${g}, ${b}, ${+(a / 255).toFixed(3)})`;
}

export function parseSvgStyleVars(svgText: string): Map<string, string> {
    const open = svgText.match(/<svg\b[^>]*>/i)?.[0] ?? '';
    const style = open.match(/\bstyle=(["'])(.*?)\1/i)?.[2] ?? '';
    const map = new Map<string, string>();
    for (const part of style.split(';')) {
        const colon = part.indexOf(':');
        if (colon === -1) {
            continue;
        }
        const name = part.slice(0, colon).trim();
        const value = part.slice(colon + 1).trim();
        if (name.startsWith('--') && value) {
            map.set(name, value);
        }
    }
    return map;
}

export function buildDerivedPaintPalette(vars: Map<string, string>): Map<string, string> {
    const bg = toPaintHex(vars.get('--bg') ?? '#ffffff');
    const fg = toPaintHex(vars.get('--fg') ?? '#000000');
    const line = optionalPaint(vars, '--line');
    const accent = optionalPaint(vars, '--accent');
    const muted = optionalPaint(vars, '--muted');
    const surface = optionalPaint(vars, '--surface');
    const border = optionalPaint(vars, '--border');

    const pal = new Map<string, string>();
    pal.set('--bg', bg);
    pal.set('--fg', fg);
    if (line) {
        pal.set('--line', line);
    }
    if (accent) {
        pal.set('--accent', accent);
    }
    if (muted) {
        pal.set('--muted', muted);
    }
    if (surface) {
        pal.set('--surface', surface);
    }
    if (border) {
        pal.set('--border', border);
    }

    pal.set('--_text', fg);
    pal.set('--_text-sec', muted ?? mixSrgb(fg, MIX.textSec, bg));
    pal.set('--_text-muted', muted ?? mixSrgb(fg, MIX.textMuted, bg));
    pal.set('--_text-faint', mixSrgb(fg, MIX.textFaint, bg));
    pal.set('--_line', line ?? mixSrgb(fg, MIX.line, bg));
    pal.set('--_arrow', accent ?? mixSrgb(fg, MIX.arrow, bg));
    pal.set('--_node-fill', surface ?? mixSrgb(fg, MIX.nodeFill, bg));
    pal.set('--_node-stroke', border ?? mixSrgb(fg, MIX.nodeStroke, bg));
    pal.set('--_group-fill', bg);
    pal.set('--_group-hdr', mixSrgb(fg, MIX.groupHeader, bg));
    pal.set('--_inner-stroke', mixSrgb(fg, MIX.innerStroke, bg));
    pal.set('--_key-badge', mixSrgb(fg, MIX.keyBadge, bg));
    return pal;
}

/** Mix `fgPercent` of `fg` into `bg` (sRGB, same as `color-mix(in srgb, fg N%, bg)`). */
export function mixSrgb(fg: string, fgPercent: number, bg: string): string {
    const a = parseRgb(fg) ?? { r: 0, g: 0, b: 0, a: 1 };
    const b = parseRgb(bg) ?? { r: 255, g: 255, b: 255, a: 1 };
    const t = fgPercent / 100;
    return rgbToHex(
        Math.round(a.r * t + b.r * (1 - t)),
        Math.round(a.g * t + b.g * (1 - t)),
        Math.round(a.b * t + b.b * (1 - t)),
    );
}

/**
 * Bake var() / color-mix() / oklch() in SVG markup to sRGB so the file
 * matches the in-browser preview when opened on its own.
 */
export function flattenSvgColors(svgText: string): string {
    if (!NEEDS_FLATTEN.test(svgText)) {
        return svgText;
    }

    const palette = buildDerivedPaintPalette(parseSvgStyleVars(svgText));
    const flattened = rewriteCssColorFunctions(svgText, (expr) => resolveColorExpr(expr, palette));
    return stripUnsetPaintVarsFromSvgOpen(flattened);
}

export function stripSvgFontImports(svgText: string): string {
    return svgText.replace(FONT_IMPORT_RE, '');
}

export function processExportedSvg(svgText: string, opts: SvgExportProcess): string {
    let out = opts.flattenColors ? flattenSvgColors(svgText) : svgText;
    if (!opts.includeFontImport) {
        out = stripSvgFontImports(out);
    }
    return out;
}

export function resolveColorExpr(expr: string, palette: Map<string, string>): string {
    const trimmed = expr.trim();
    const varMatch = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\s*\)$/.exec(trimmed);
    if (varMatch) {
        const mapped = palette.get(varMatch[1]);
        if (mapped) {
            return mapped;
        }
        const fallback = varMatch[2]?.trim();
        if (fallback && !CSS_WIDE.test(fallback)) {
            return fallback;
        }
        return expr;
    }

    const mixed = mixParsedColorMix(trimmed);
    if (mixed) {
        return mixed;
    }
    return cssColorToSrgb(trimmed);
}

function optionalPaint(vars: Map<string, string>, name: string): string | undefined {
    const value = vars.get(name);
    if (!value || CSS_WIDE.test(value)) {
        return undefined;
    }
    return toPaintHex(value);
}

function toPaintHex(color: string): string {
    return cssColorToSrgb(color);
}

function mixParsedColorMix(expr: string): string | null {
    const inner = /^color-mix\(\s*in srgb,\s*(.+)\s*\)$/i.exec(expr)?.[1];
    if (!inner) {
        return null;
    }
    const comma = splitTopLevelComma(inner);
    if (comma.length !== 2) {
        return null;
    }
    const a = parseColorStop(comma[0]!);
    const b = parseColorStop(comma[1]!);
    if (!a || !b) {
        return null;
    }
    const t = (a.pct ?? (b.pct === undefined ? 50 : 100 - b.pct)) / 100;
    const u = (b.pct ?? (100 - t * 100)) / 100;
    const sum = t + u || 1;
    const ar = a.rgb;
    const br = b.rgb;
    const alpha = (ar.a * t + br.a * u) / sum;
    const r = Math.round((ar.r * t + br.r * u) / sum);
    const g = Math.round((ar.g * t + br.g * u) / sum);
    const bch = Math.round((ar.b * t + br.b * u) / sum);
    if (alpha <= 0) {
        return 'transparent';
    }
    if (alpha >= 1) {
        return rgbToHex(r, g, bch);
    }
    return `rgba(${r}, ${g}, ${bch}, ${+alpha.toFixed(3)})`;
}

function parseColorStop(input: string): { rgb: Rgb; pct?: number; } | null {
    const trimmed = input.trim();
    const m = /^(.+?)\s+([\d.]+)%$/.exec(trimmed);
    const color = (m ? m[1] : trimmed).trim();
    const pct = m ? Number(m[2]) : undefined;
    if (color === 'transparent') {
        return { rgb: { r: 0, g: 0, b: 0, a: 0 }, pct };
    }
    const rgb = parseRgb(color);
    if (!rgb) {
        return null;
    }
    return { rgb, pct };
}

function splitTopLevelComma(input: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === '(') {
            depth++;
        } else if (ch === ')') {
            depth--;
        } else if (ch === ',' && depth === 0) {
            parts.push(input.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(input.slice(start));
    return parts;
}

function stripUnsetPaintVarsFromSvgOpen(svgText: string): string {
    return svgText.replace(
        /^(<svg\b[^>]*\bstyle=")([^"]*)(")/i,
        (_all, open: string, style: string, close: string) => {
            const cleaned = style
                .split(';')
                .map((part) => part.trim())
                .filter((part) => part && !/:\s*(initial|unset|inherit|revert)\s*$/i.test(part))
                .join(';');
            return `${open}${cleaned}${close}`;
        },
    );
}

type Rgb = { r: number; g: number; b: number; a: number; };

function parseRgb(color: string): Rgb | null {
    const trimmed = color.trim();
    const short = /^#([0-9a-f]{3})$/i.exec(trimmed);
    if (short) {
        const [r, g, b] = [...short[1]!].map((c) => parseInt(c + c, 16));
        return { r: r!, g: g!, b: b!, a: 1 };
    }
    const long = /^#([0-9a-f]{6})$/i.exec(trimmed);
    if (long) {
        const h = long[1]!;
        return {
            r: parseInt(h.slice(0, 2), 16),
            g: parseInt(h.slice(2, 4), 16),
            b: parseInt(h.slice(4, 6), 16),
            a: 1,
        };
    }
    const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(trimmed);
    if (rgb) {
        return {
            r: Math.round(Number(rgb[1])),
            g: Math.round(Number(rgb[2])),
            b: Math.round(Number(rgb[3])),
            a: rgb[4] === undefined ? 1 : Number(rgb[4]),
        };
    }
    return null;
}

function rgbToHex(r: number, g: number, b: number): string {
    return `#${hex2(clampByte(r))}${hex2(clampByte(g))}${hex2(clampByte(b))}`;
}

function clampByte(n: number): number {
    return Math.max(0, Math.min(255, Math.round(n)));
}

let colorCtx: CanvasRenderingContext2D | null | undefined;

function getColorCtx(): CanvasRenderingContext2D | null {
    if (colorCtx !== undefined) {
        return colorCtx;
    }
    if (typeof document === 'undefined') {
        colorCtx = null;
        return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    colorCtx = canvas.getContext('2d', { willReadFrequently: true });
    return colorCtx;
}

function hex2(n: number): string {
    return n.toString(16).padStart(2, '0');
}
