import { useSnapshot } from "valtio";
import { Tabs } from "@/ui/shadcn/tabs";
import { TabsListAnimated, TabsTriggerAnimated } from "@/ui/local-ui/5-tabs-animated";

import { mermaidSettings, OutputFormat } from "@/store/2-mermaid-settings";

import { Preview_Mmd } from "../1-mmd/0-all-mmd/1-view-mmd";
import { MmdConverter } from "../1-mmd/1-render/1-mmd-converter";
import { Preview_Rflow } from "../2-rflow/0-all-rflow/1-view-rflow";
import { Preview_Bm } from "../3-bm/0-all-bm/1-view-bm";

import { PreviewToolbar_Mmd } from "../1-mmd/0-all-mmd/8-1-0-mmd-toolbar";
import { PreviewToolbar_Rflow } from "../2-rflow/0-all-rflow/8-1-2-toolbar-rflow";
import { PreviewToolbar_Bm } from "../3-bm/0-all-bm/8-1-toolbar-bm";

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
        <div className="px-3 h-9 bg-muted/30 border-b border-border overflow-x-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
                <Tabs value={outputFormat} onValueChange={(v) => { mermaidSettings.outputFormat = v as OutputFormat; }}>
                    <TabsListAnimated layoutId="preview-output-format" className="p-0.5 h-6!">
                        <TabsTriggerAnimated value={OutputFormat.mmd} selectedValue={outputFormat} className="px-2 text-[.7rem]">Mermaid</TabsTriggerAnimated>
                        <TabsTriggerAnimated value={OutputFormat.flow} selectedValue={outputFormat} className="px-2 text-[.7rem]">Flow</TabsTriggerAnimated>
                        <TabsTriggerAnimated value={OutputFormat.svg} selectedValue={outputFormat} className="px-2 text-[.7rem]">SVG</TabsTriggerAnimated>
                        <TabsTriggerAnimated value={OutputFormat.text} selectedValue={outputFormat} className="px-2 text-[.7rem]">Text</TabsTriggerAnimated>
                    </TabsListAnimated>
                </Tabs>
            </div>

            <div className="flex items-center">
                {
                    outputFormat === OutputFormat.mmd
                        ? <PreviewToolbar_Mmd />
                        : outputFormat === OutputFormat.flow
                            ? <PreviewToolbar_Rflow />
                            : <PreviewToolbar_Bm />
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
