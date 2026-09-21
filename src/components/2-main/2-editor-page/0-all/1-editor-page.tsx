import { useSnapshot } from "valtio";
import { type Layout } from "react-resizable-panels";
import { appSettings } from "@/store/1-ui-settings";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/ui/shadcn/resizable";
import { Header } from "@/components/1-header";
import { EditorPanel } from "../1-panel-editor/1-editor-panel";
import { PreviewPanel } from "../2-panel-diagrams/0-all-panels/0-preview-panel";
import { RflowConverter } from "../2-panel-diagrams/2-rflow/0-all-rflow/rflow-converter";

export function EditorPage() {
    const { panelSizes } = useSnapshot(appSettings);

    const onLayoutChanged = (layout: Layout) => {
        appSettings.panelSizes = { ...appSettings.panelSizes, horizontal: layout };
    };

    return (
        <div className="h-dvh text-foreground bg-background overflow-hidden grid grid-rows-[auto_1fr]">
            <Header />
            <RflowConverter />

            <div className="min-h-0 overflow-hidden">
                <ResizablePanelGroup orientation="horizontal" defaultLayout={panelSizes.horizontal as Layout} onLayoutChanged={onLayoutChanged}>
                    <ResizablePanel id="left" minSize={15}>
                        <EditorPanel />
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    <ResizablePanel id="right" minSize={20}>
                        <PreviewPanel />
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
}
