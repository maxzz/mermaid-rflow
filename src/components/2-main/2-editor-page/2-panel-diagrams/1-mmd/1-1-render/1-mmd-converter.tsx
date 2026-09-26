import { useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import { appSettings } from '@/store/1-ui-settings';
import { useDebouncedValue } from '@/utils/util-hooks/use-debounced-value';
import { isThemeDark } from '@/utils/theme-utils';
import { mermaidSettings, OutputFormat } from '@/store/2-mermaid-settings';

import { mmdSettings } from '../8-store/2-mmd-settings';
import { resolveMmdTheme } from './8-themes';
import { mmdDiagram } from '../8-store/1-mmd-diagram';
import { officialConfigSig, formatMermaidError, renderOfficialMermaid } from './2-render-official';

const RENDER_DEBOUNCE_MS = 300;

/**
 * Debounced official mermaid.render.
 * Renders into an absolute inset-0 host so mermaid cannot append a temp diagram to document.body
 * and grow the page. Size comes from the relative + absolute inset-0 preview pane.
 */
export function MmdConverter() {
    const hostRef = useRef<HTMLDivElement>(null);

    const { source, outputFormat } = useSnapshot(mermaidSettings);
    const { theme, adaptive, look, layout } = useSnapshot(mmdSettings);
    const { immediate } = useSnapshot(mmdDiagram);
    const { theme: appTheme } = useSnapshot(appSettings);
    const delay = outputFormat === OutputFormat.mmd && immediate ? 0 : RENDER_DEBOUNCE_MS;
    const debounced = useDebouncedValue(source, delay);
    const resolvedTheme = resolveMmdTheme(theme, adaptive, isThemeDark(appTheme));
    const configSig = officialConfigSig(resolvedTheme, look, layout);

    useEffect(
        () => {
            if (outputFormat !== OutputFormat.mmd) {
                return;
            }

            let cancelled = false;
            const text = immediate ? mermaidSettings.source : debounced;

            async function run() {
                const renderHost = hostRef.current;
                if (!renderHost) {
                    return;
                }

                if (text === mmdDiagram.lastRenderedSource && configSig === mmdDiagram.lastConfigSig && !mmdDiagram.error) {
                    mmdDiagram.immediate = false;
                    return;
                }

                if (!text.trim()) {
                    mmdDiagram.svg = '';
                    mmdDiagram.error = null;
                    mmdDiagram.ms = 0;
                    mmdDiagram.diagramType = null;
                    mmdDiagram.lastRenderedSource = text;
                    mmdDiagram.lastConfigSig = configSig;
                    mmdDiagram.rendering = false;
                    mmdDiagram.immediate = false;
                    return;
                }

                mmdDiagram.rendering = true;
                mmdDiagram.error = null;
                const t0 = performance.now();
                try {
                    const result = await renderOfficialMermaid(text, resolvedTheme, look, renderHost, layout);
                    if (cancelled) {
                        return;
                    }
                    mmdDiagram.svg = result.svg;
                    mmdDiagram.diagramType = result.diagramType;
                    mmdDiagram.ms = performance.now() - t0;
                    mmdDiagram.lastRenderedSource = text;
                    mmdDiagram.lastConfigSig = configSig;
                    mmdDiagram.error = null;
                } catch (err) {
                    if (cancelled) {
                        return;
                    }
                    mmdDiagram.svg = '';
                    mmdDiagram.error = formatMermaidError(err);
                    mmdDiagram.ms = performance.now() - t0;
                    mmdDiagram.lastRenderedSource = text;
                    mmdDiagram.lastConfigSig = configSig;
                } finally {
                    if (!cancelled) {
                        mmdDiagram.rendering = false;
                        mmdDiagram.immediate = false;
                    }
                }
            }

            void run();
            return () => { cancelled = true; };
        },
        [adaptive, configSig, debounced, immediate, layout, look, outputFormat, resolvedTheme],
    );

    return (
        <div
            ref={hostRef}
            className="absolute inset-0 opacity-0 overflow-hidden pointer-events-none"
            aria-hidden
        />
    );
}
