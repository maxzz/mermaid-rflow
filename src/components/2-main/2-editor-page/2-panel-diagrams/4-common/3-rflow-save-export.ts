import { toast } from "sonner";
import { mermaidSettings } from "@/store/2-mermaid-settings";
import { uuid } from "@/utils/uuid";
import { addSavedDiagram, cloneGraphData } from "../2-rflow/8-store/1-local-storage-saved-diagrams";
import { rflowDiagram } from "../2-rflow/store/1-flow-diagram";

export function saveCurrentFlow() {
    const src = mermaidSettings.source.trim();
    if (!src || rflowDiagram.nodes.length === 0) {
        toast.message('Cannot save: provide Mermaid flowchart source and at least one node.');
        return;
    }
    const now = Date.now();
    addSavedDiagram({
        id: uuid(),
        name: new Date(now).toLocaleString(),
        mermaid: mermaidSettings.source,
        nodes: cloneGraphData(rflowDiagram.nodes),
        edges: cloneGraphData(rflowDiagram.edges),
        createdAt: now,
        updatedAt: now,
    });
    toast.success('Diagram saved');
}

export function exportFlowJson() {
    const src = mermaidSettings.source.trim();
    if (!src || rflowDiagram.nodes.length === 0) {
        toast.message('Cannot export: provide Mermaid flowchart source and at least one node.');
        return;
    }
    const now = Date.now();
    const payload = {
        id: `export-${now}`,
        name: `diagram-${new Date(now).toISOString().slice(0, 19).replace(/:/g, '-')}`,
        mermaid: mermaidSettings.source,
        nodes: cloneGraphData(rflowDiagram.nodes),
        edges: cloneGraphData(rflowDiagram.edges),
        createdAt: now,
        updatedAt: now,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${payload.name}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Exported diagram as JSON');
}
