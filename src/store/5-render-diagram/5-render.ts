import { useEffect, useState } from 'react';
import { proxy } from 'valtio';
import { type AsciiRenderOptions, type DiagramColors, type RenderOptions } from 'beautiful-mermaid'; // `import type` only: keep the lazy chunk lazy
import { type BeautifulMermaidModule } from '@/components/2-main/2-editor-page/1-panel-editor/8-lazy-modules';
import { type DiagramTheme, type MermaidSettings, type OutputFormat } from '../2-mermaid-settings';
import { resolveCssVar } from '@/components/4-dialogs/2-export/8-export-utils';
import { processExportedSvg, type SvgExportProcess } from '@/components/4-dialogs/2-export/8-flatten-svg-colors';
import { fixMermaidAsciiBoxes } from '@/utils/local/fix-mermaid-ascii';
import { detectGraphDirection, routeDiamondEdges } from '@/utils/local/route-diamond-edges';

export type RenderResult = {
    format: OutputFormat;
    output: string;         // SVG markup or plain text; empty when error or empty source
    error: string | null;
    ms: number;             // render time
};

export type RenderSettings = Pick<MermaidSettings, 'diagramTheme' | 'ascii' | 'svg'>;
export type { SvgExportProcess };

const EMPTY_SOURCE_RESULT = (format: OutputFormat): RenderResult => ({ format, output: '', error: null, ms: 0 });

/**
 * Colors for the SVG renderer.
 * - 'auto' in the preview passes CSS variables so light/dark switches apply live without re-render.
 * - 'auto' for export resolves the current computed colors to sRGB hex.
 * - A named theme uses beautiful-mermaid's THEMES palette.
 * Export can also inline var() / color-mix() so standalone SVG viewers do not fall back to black.
 */
function getDiagramColors(bm: BeautifulMermaidModule, theme: DiagramTheme, forExport: boolean): { colors: DiagramColors; transparent: boolean; } {
    if (theme === 'auto') {
        if (forExport) {
            return {
                colors: isolateFromAppTheme({
                    bg: resolveCssVar('--background', bm.DEFAULTS.bg),
                    fg: resolveCssVar('--foreground', bm.DEFAULTS.fg),
                }),
                transparent: false,
            };
        }
        return {
            colors: isolateFromAppTheme({ bg: 'var(--background)', fg: 'var(--foreground)' }),
            transparent: true,
        };
    }

    const named = bm.THEMES[theme];
    return {
        colors: isolateFromAppTheme(named ?? { bg: bm.DEFAULTS.bg, fg: bm.DEFAULTS.fg }),
        transparent: false,
    };
}

/**
 * beautiful-mermaid reads optional `--accent` / `--muted` / `--border` on the SVG
 * (arrowheads, edge labels, node strokes). Those names collide with shadcn tokens
 * on `:root`, so an unset zinc-light palette inherits the app theme: light
 * `--accent`/`--muted` are nearly white, which makes labels and arrows vanish.
 *
 * `initial` is the guaranteed-invalid custom-property value, so
 * `var(--accent, color-mix(...))` in the SVG uses the library fallback instead
 * of the inherited app token. Named themes that set these colors keep them.
 */
const UNSET_DIAGRAM_VAR = 'initial';

export function isolateFromAppTheme(colors: DiagramColors): DiagramColors {
    return {
        bg: colors.bg,
        fg: colors.fg,
        line: colors.line ?? UNSET_DIAGRAM_VAR,
        accent: colors.accent ?? UNSET_DIAGRAM_VAR,
        muted: colors.muted ?? UNSET_DIAGRAM_VAR,
        surface: colors.surface ?? UNSET_DIAGRAM_VAR,
        border: colors.border ?? UNSET_DIAGRAM_VAR,
    };
}

export function buildSvgOptions(bm: BeautifulMermaidModule, settings: RenderSettings, forExport: boolean): RenderOptions {
    const { colors, transparent } = getDiagramColors(bm, settings.diagramTheme, forExport);
    return {
        ...colors,
        transparent,
        font: settings.svg.font,
        padding: settings.svg.padding,
        nodeSpacing: settings.svg.nodeSpacing,
        layerSpacing: settings.svg.layerSpacing,
        // Extra ELK fields: read by the Vite-patched beautiful-mermaid bundle.
        ...settings.svg.elk,
    };
}

export function buildAsciiOptions(settings: RenderSettings): AsciiRenderOptions {
    return {
        useAscii: settings.ascii.useAscii,
        paddingX: settings.ascii.paddingX,
        paddingY: settings.ascii.paddingY,
        colorMode: 'none', // plain text: no ANSI escape sequences
    };
}

/** Pure, synchronous render. Never throws; errors are returned in the result. */
export function renderDiagram(bm: BeautifulMermaidModule, source: string, settings: RenderSettings, format: OutputFormat, exportProcess?: SvgExportProcess): RenderResult {
    const text = source.trim();
    if (!text) {
        return EMPTY_SOURCE_RESULT(format);
    }

    const t0 = performance.now();
    try {
        const forExport = !!exportProcess;
        const output = format === 'svg'
            ? applyExportProcess(
                routeDiamondEdges(bm.renderMermaidSVG(text, buildSvgOptions(bm, settings, forExport)), detectGraphDirection(text)),
                exportProcess,
            )
            : fixMermaidAsciiBoxes(bm.renderMermaidASCII(text, buildAsciiOptions(settings)));

        return { format, output, error: null, ms: performance.now() - t0 };
    } catch (err) {
        return { format, output: '', error: err instanceof Error ? err.message : String(err), ms: performance.now() - t0 };
    }
}

function applyExportProcess(svg: string, exportProcess?: SvgExportProcess): string {
    return exportProcess ? processExportedSvg(svg, exportProcess) : svg;
}

/** Last preview render outcome (not persisted); published by the preview, shown by the status bar. */
export const previewStatus = proxy<{ error: string | null; ms: number; empty: boolean; }>({
    error: null,
    ms: 0,
    empty: true,
});

export function publishPreviewStatus(result: RenderResult) {
    previewStatus.error = result.error;
    previewStatus.ms = result.ms;
    previewStatus.empty = !result.output && !result.error;
}

/** Debounced value: re-rendering the diagram on every keystroke is wasteful. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(
        () => {
            const id = setTimeout(() => setDebounced(value), delayMs);
            return () => clearTimeout(id);
        },
        [value, delayMs]);

    return debounced;
}
