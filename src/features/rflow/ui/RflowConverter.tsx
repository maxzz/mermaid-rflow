import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { useDebouncedValue } from '@/utils/util-hooks/useDebouncedValue';
import { convertMermaidToReactFlow } from '../converter';
import { rflowDiagram } from '../store/1-flow-diagram';

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
                if (text === rflowDiagram.lastAppliedSource) {
                    return;
                }

                if (!text.trim()) {
                    rflowDiagram.nodes = [];
                    rflowDiagram.edges = [];
                    rflowDiagram.error = null;
                    rflowDiagram.ms = 0;
                    rflowDiagram.lastAppliedSource = text;
                    rflowDiagram.converting = false;
                    return;
                }

                rflowDiagram.converting = true;
                rflowDiagram.error = null;
                const t0 = performance.now();
                try {
                    const data = await convertMermaidToReactFlow(text);
                    if (cancelled) {
                        return;
                    }
                    rflowDiagram.nodes = data.nodes;
                    rflowDiagram.edges = data.edges;
                    rflowDiagram.ms = performance.now() - t0;
                    rflowDiagram.lastAppliedSource = text;
                    rflowDiagram.error = data.nodes.length
                        ? null
                        : 'No flowchart nodes found. The React Flow converter supports graph/flowchart diagrams.';
                } catch (err) {
                    if (cancelled) {
                        return;
                    }
                    rflowDiagram.error = err instanceof Error ? err.message : String(err);
                    rflowDiagram.ms = performance.now() - t0;
                    rflowDiagram.lastAppliedSource = text;
                } finally {
                    if (!cancelled) {
                        rflowDiagram.converting = false;
                    }
                }
            }

            void run();
            return () => { cancelled = true; };
        },
        [debounced],
    );

    return null;
}
