import { LoadDialog } from "../2-rflow/ui/LoadDialog";
import { PreviewToolbar } from "./2-preview-toolbar";
import { StatusBar } from "./5-status-bar";
import { Preview_Flow } from "../2-rflow/0-all-rflow/1-1-view-flow";
import { Preview_Mermaid } from "../1-mmd/0-all-mmd/1-2-view-mermaid";
import { Preview_BeautifullMarmaid } from "../3-bm/0-all-bm/1-3-0-view-beautiful-mermaid";

export function PreviewPanel() {
    return (
        <div className="h-full bg-muted/20 flex flex-col">
            <PreviewToolbar />

            <div className="relative flex-1 min-h-0">
                <div className="absolute inset-0 overflow-hidden">
                    <Preview_Flow />
                    <Preview_Mermaid />
                    <Preview_BeautifullMarmaid />
                </div>
            </div>

            <StatusBar />
            <LoadDialog />
        </div>
    );
}
