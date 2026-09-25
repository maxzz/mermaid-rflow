import { toast } from "sonner";
import { mermaidSettings } from "@/store/2-mermaid-settings";
import { uuid } from "@/utils/uuid";
import { copyText } from "@/components/4-dialogs/2-export/8-export-utils";
import { addSavedDiagram, cloneGraphData } from "../2-rflow/8-store/a-8-local-storage-saved-diagrams";
import { rf_Diagram } from "../2-rflow/8-store/a-0-flow-diagram";

export function saveCurrentFlow() {
    const src = mermaidSettings.source.trim();
    if (!src || rf_Diagram.nodes.length === 0) {
        toast.message('Cannot save: provide Mermaid flowchart source and at least one node.');
        return;
    }
    const now = Date.now();
    addSavedDiagram({
        id: uuid(),
        name: new Date(now).toLocaleString(),
        mermaid: mermaidSettings.source,
        nodes: cloneGraphData(rf_Diagram.nodes),
        edges: cloneGraphData(rf_Diagram.edges),
        createdAt: now,
        updatedAt: now,
    });
    toast.success('Diagram saved');
}

export async function copyFlowJson() {
    const payload = buildFlowExportPayload();
    if (!payload) {
        return;
    }
    await copyText(JSON.stringify(payload, null, 2));
    toast.success("JSON copied to clipboard");
}

export function exportFlowJson() {
    const payload = buildFlowExportPayload();
    if (!payload) {
        return;
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${payload.name}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Exported diagram as JSON");
}

function buildFlowExportPayload() {
    const src = mermaidSettings.source.trim();
    if (!src || rf_Diagram.nodes.length === 0) {
        toast.message("Cannot export: provide Mermaid flowchart source and at least one node.");
        return null;
    }
    const now = Date.now();
    return {
        id: `export-${now}`,
        name: `diagram-${new Date(now).toISOString().slice(0, 19).replace(/:/g, "-")}`,
        mermaid: mermaidSettings.source,
        nodes: cloneGraphData(rf_Diagram.nodes),
        edges: cloneGraphData(rf_Diagram.edges),
        createdAt: now,
        updatedAt: now,
    };
}
