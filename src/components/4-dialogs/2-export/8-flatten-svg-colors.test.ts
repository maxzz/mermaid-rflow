import { describe, expect, it } from 'vitest';
import {
    buildDerivedPaintPalette,
    flattenSvgColors,
    mixSrgb,
    parseSvgStyleVars,
    processExportedSvg,
    rewriteCssColorFunctions,
    stripSvgFontImports,
} from './8-flatten-svg-colors';

describe('rewriteCssColorFunctions', () => {
    it('does not treat var(--_text) as a prefix of var(--_text-sec)', () => {
        const out = rewriteCssColorFunctions(
            'fill="var(--_text)" stroke="var(--_text-sec)"',
            (expr) => {
                if (expr === 'var(--_text)') {
                    return '#111111';
                }
                if (expr === 'var(--_text-sec)') {
                    return '#666666';
                }
                return expr;
            },
        );
        expect(out).toBe('fill="#111111" stroke="#666666"');
    });

    it('resolves nested var() and color-mix() innermost first', () => {
        const out = rewriteCssColorFunctions(
            'var(--accent, color-mix(in srgb, var(--fg) 85%, var(--bg)))',
            (expr) => {
                if (expr === 'var(--fg)') {
                    return '#ffffff';
                }
                if (expr === 'var(--bg)') {
                    return '#000000';
                }
                if (expr === 'color-mix(in srgb, #ffffff 85%, #000000)') {
                    return '#d9d9d9';
                }
                if (expr === 'var(--accent, #d9d9d9)') {
                    return '#d9d9d9';
                }
                return expr;
            },
        );
        expect(out).toBe('#d9d9d9');
    });

    it('leaves non-color text and url() imports alone', () => {
        const css = "@import url('https://fonts.googleapis.com/css2?family=Inter'); text { font-family: Inter; }";
        expect(rewriteCssColorFunctions(css, () => '#ff0000')).toBe(css);
    });
});

describe('buildDerivedPaintPalette', () => {
    it('mixes light line and text from a dark bg/fg pair and ignores initial optionals', () => {
        const pal = buildDerivedPaintPalette(new Map([
            ['--bg', '#18181B'],
            ['--fg', '#FAFAFA'],
            ['--line', 'initial'],
            ['--accent', 'initial'],
            ['--muted', 'initial'],
        ]));

        expect(pal.get('--_text')).toBe('#fafafa');
        expect(pal.get('--_line')).toBe(mixSrgb('#fafafa', 50, '#18181b'));
        expect(luma(pal.get('--_text')!)).toBeGreaterThan(0.8);
        expect(luma(pal.get('--_line')!)).toBeGreaterThan(0.25);
        expect(pal.get('--_line')).not.toBe('#000000');
        expect(pal.has('--line')).toBe(false);
    });
});

describe('flattenSvgColors', () => {
    it('returns markup unchanged when there is nothing to flatten', () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#111111"/></svg>';
        expect(flattenSvgColors(svg)).toBe(svg);
    });

    it('bakes dark-palette paints to light hex instead of black', () => {
        const svg = [
            '<svg xmlns="http://www.w3.org/2000/svg" style="--bg:#18181B;--fg:#FAFAFA;--line:initial;--accent:initial;--muted:initial;background:var(--bg)">',
            '  <rect fill="var(--_node-fill)" stroke="var(--_line)"/>',
            '  <text fill="var(--_text)">Hi</text>',
            '</svg>',
        ].join('\n');

        const out = flattenSvgColors(svg);
        expect(out).not.toMatch(/var\(/);
        expect(out).not.toMatch(/:initial/);
        expect(out).toContain('fill="#fafafa"');
        expect(out).toContain(`stroke="${mixSrgb('#fafafa', 50, '#18181b')}"`);
        expect(parseSvgStyleVars(out).get('--bg')?.toLowerCase()).toBe('#18181b');
    });
});

describe('stripSvgFontImports', () => {
    it('removes Google Fonts @import and keeps font-family', () => {
        const svg = `<style>\n  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400&amp;display=swap');\n  text { font-family: 'Inter', system-ui, sans-serif; }\n</style>`;
        const out = stripSvgFontImports(svg);
        expect(out).not.toMatch(/@import/);
        expect(out).toContain("font-family: 'Inter'");
    });
});

describe('processExportedSvg', () => {
    const svg = `<svg style="--bg:#fff;--fg:#111"><style>\n  @import url('https://fonts.googleapis.com/css2?family=Inter');\n  text { font-family: Inter; }\n</style><text fill="var(--_text)">A</text></svg>`;

    it('can keep CSS variables and drop the font import', () => {
        const out = processExportedSvg(svg, { flattenColors: false, includeFontImport: false });
        expect(out).toContain('var(--_text)');
        expect(out).not.toMatch(/@import/);
    });

    it('flattens colors and can keep the font import', () => {
        const out = processExportedSvg(svg, { flattenColors: true, includeFontImport: true });
        expect(out).toContain('fill="#111111"');
        expect(out).toMatch(/@import/);
    });
});

function luma(hex: string): number {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
