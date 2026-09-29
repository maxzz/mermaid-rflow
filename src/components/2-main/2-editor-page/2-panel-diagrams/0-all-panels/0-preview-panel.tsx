import { useSnapshot } from "valtio";
import { mermaidSettings, OutputFormat } from "@/store/2-mermaid-settings";

import { Preview_Mmd } from "../1-mmd/0-all-mmd/1-view-mmd";
import { MmdConverter } from "../1-mmd/1-1-render/1-mmd-converter";
import { Preview_Rflow } from "../2-rflow/0-all-rflow/1-view-rflow";
import { Preview_Bm } from "../3-bm/0-all-bm/1-view-bm";

import { Right_Toolbar_Mmd } from "../1-mmd/0-all-mmd/8-1-0-mmd-toolbar";
import { Right_Toolbar_Rflow } from "../2-rflow/0-all-rflow/8-1-2-0-toolbar-rflow";
import { Right_Toolbar_Bm } from "../3-bm/0-all-bm/8-1-0-toolbar-bm";

import { StatusBar_Mmd } from "../1-mmd/0-all-mmd/8-2-statusbar-mmd-";
import { StatusBar_Rflow } from "../2-rflow/0-all-rflow/8-2-statusbar-rflow";
import { StatusBar_Bm } from "../3-bm/0-all-bm/8-2-statusbar-bm";

export function PreviewPanel() {
    return (
        <div className="h-full bg-muted/20 flex flex-col">
            <Diagrams_Toolbar />

            <div className="flex-1 relative min-h-0">
                <div className="absolute inset-0 overflow-hidden">
                    <MmdConverter />
                    <Preview_Mmd />
                    <Preview_Rflow />
                    <Preview_Bm />
                </div>
            </div>

            <Diagrams_StatusBar />
        </div>
    );
}

function Diagrams_Toolbar() {
    const { outputFormat } = useSnapshot(mermaidSettings);

    return (
        <div className="px-3 h-9 bg-muted/30 border-b border-border overflow-x-auto flex items-center justify-end gap-2">
            <div className="flex items-center">
                {
                    outputFormat === OutputFormat.mmd
                        ? <Right_Toolbar_Mmd />
                        : outputFormat === OutputFormat.flow
                            ? <Right_Toolbar_Rflow />
                            : <Right_Toolbar_Bm />
                }
            </div>
        </div>
    );
}

function Diagrams_StatusBar() {
    const { outputFormat } = useSnapshot(mermaidSettings);

    return (
        outputFormat === OutputFormat.mmd
            ? <StatusBar_Mmd />
            : outputFormat === OutputFormat.flow
                ? <StatusBar_Rflow />
                : <StatusBar_Bm />
    );
}
