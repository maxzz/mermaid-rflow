import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { appSettings } from '@/store/1-ui-settings';
import { mermaidSettings, OutputFormat } from '@/store/2-mermaid-settings';
import { useDebouncedValue } from '@/utils/util-hooks/useDebouncedValue';
import { isThemeDark } from '@/utils/theme-utils';
import { mmdDiagram } from '../store/1-mmd-diagram';
import { mmdSettings } from '../store/2-mmd-settings';
import { officialConfigSig, formatMermaidError, renderOfficialMermaid } from '../render/2-render-official';
import { resolveMmdTheme } from '../render/1-themes';

const RENDER_DEBOUNCE_MS = 300;

/** Debounced official mermaid.render. Mount once on the editor page. */
export function MmdConverter() {
    const { source, outputFormat } = useSnapshot(mermaidSettings);
    const { theme, adaptive, look } = useSnapshot(mmdSettings);
    const { immediate } = useSnapshot(mmdDiagram);
    const { theme: appTheme } = useSnapshot(appSettings);
    const delay = outputFormat === OutputFormat.mmd && immediate ? 0 : RENDER_DEBOUNCE_MS;
    const debounced = useDebouncedValue(source, delay);
    const resolvedTheme = resolveMmdTheme(theme, adaptive, isThemeDark(appTheme));
    const configSig = officialConfigSig(resolvedTheme, look);

    useEffect(
        () => {
            if (outputFormat !== OutputFormat.mmd) {
                return;
            }

            let cancelled = false;
            const text = immediate ? mermaidSettings.source : debounced;

            async function run() {
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
                    const result = await renderOfficialMermaid(text, resolvedTheme, look);
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
        [adaptive, configSig, debounced, immediate, look, outputFormat, resolvedTheme],
    );

    return null;
}
