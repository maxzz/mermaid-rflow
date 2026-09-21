import { type Edge, type Node } from 'reactflow';
import { toast } from 'sonner';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { captureMonacoView } from '../../3-bm/5-1-source-diagram-link-monaco/2-monaco-editor-handle';
import { reactFlowToMermaid } from '../2-converter/reactFlowToMermaid';
import { rflowDiagram } from '../8-store/2-flow-diagram';

/** 
 * Write flowchart topology into Monaco without triggering a Dagre reconvert. 
 */
export function applySourceFromCanvas(next: string) {
    if (next === mermaidSettings.source) {
        return;
    }
    captureMonacoView();
    rflowDiagram.lastAppliedSource = next;
    mermaidSettings.source = next;
}

export function syncMermaidFromGraph() {
    const result = reactFlowToMermaid(
        rflowDiagram.nodes as Node[],
        rflowDiagram.edges as Edge[],
        mermaidSettings.source,
    );

    if (!result.ok) {
        toast.warning('Canvas edits are not written back for this diagram type. The Flow converter only supports graph/flowchart.', { id: SKIP_TOAST_ID });
        return;
    }

    applySourceFromCanvas(result.mermaid);
}

const SKIP_TOAST_ID = 'rflow-no-writeback';
