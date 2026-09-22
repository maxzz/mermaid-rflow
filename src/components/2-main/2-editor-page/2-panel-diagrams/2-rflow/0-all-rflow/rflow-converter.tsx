import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { useDebouncedValue } from '@/utils/util-hooks/use-debounced-value';
import { convertMermaidToReactFlow } from '../2-converter';
import { rf_Diagram } from '../8-store/2-flow-diagram';

const CONVERT_DEBOUNCE_MS = 300;

/** Debounced Mermaid → React Flow conversion. Mount once on the editor page. */
export function RflowConverter() {
    const { source } = useSnapshot(mermaidSettings);
    const debounced = useDebouncedValue(source, CONVERT_DEBOUNCE_MS);

    useEffect(
        () => {
            let cancelled = false;

            async function run() {
                const text = debounced;
                if (text === rf_Diagram.lastAppliedSource) {
                    return;
                }

                if (!text.trim()) {
                    rf_Diagram.nodes = [];
                    rf_Diagram.edges = [];
                    rf_Diagram.error = null;
                    rf_Diagram.ms = 0;
                    rf_Diagram.lastAppliedSource = text;
                    rf_Diagram.converting = false;
                    return;
                }

                rf_Diagram.converting = true;
                rf_Diagram.error = null;
                const t0 = performance.now();
                try {
                    const data = await convertMermaidToReactFlow(text);
                    if (cancelled || text !== mermaidSettings.source) {
                        return;
                    }
                    rf_Diagram.nodes = data.nodes;
                    rf_Diagram.edges = data.edges;
                    rf_Diagram.ms = performance.now() - t0;
                    rf_Diagram.lastAppliedSource = text;
                    rf_Diagram.error = data.nodes.length
                        ? null
                        : 'No flowchart nodes found. The React Flow converter supports graph/flowchart diagrams.';
                } catch (err) {
                    if (cancelled || text !== mermaidSettings.source) {
                        return;
                    }
                    rf_Diagram.error = err instanceof Error ? err.message : String(err);
                    rf_Diagram.ms = performance.now() - t0;
                    rf_Diagram.lastAppliedSource = text;
                } finally {
                    if (!cancelled) {
                        rf_Diagram.converting = false;
                    }
                }
            }

            void run();
            return () => { cancelled = true; };
        },
        [debounced]);

    return null;
}
