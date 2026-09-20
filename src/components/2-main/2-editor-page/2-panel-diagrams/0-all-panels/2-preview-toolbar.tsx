import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { toast } from "sonner";
import { CopyIcon, DownloadIcon, FolderOpenIcon, ImageIcon, SaveIcon } from "lucide-react";
import { mermaidSettings, type OutputFormat } from "@/store/2-mermaid-settings";
import { renderDiagram } from "@/store/5-render-diagram/5-render";
import { loadBeautifulMermaid } from "@/components/2-main/2-editor-page/1-panel-editor/8-lazy-modules";
import { copyText } from "@/components/4-dialogs/2-export/8-export-utils";
import { isOpenExportDialogAtom } from "@/components/4-dialogs/2-export/a-types-export";
import { Button } from "@/ui/shadcn/button";
import { Tabs, TabsList, TabsTrigger } from "@/ui/shadcn/tabs";
import { RenderOptionsPopover } from "./6-render-options-popover";

import { addSavedDiagram, cloneGraphData } from "../2-rflow/storage/saved-diagrams";
import { rflowDiagram } from "../2-rflow/store/1-flow-diagram";
import { rflowLoadDialogOpenAtom, rflowCanvasMethodsAtom } from "../2-rflow/store/2-flow-ui";

import { MmdToolbarActions } from "../1-mmd/ui/MmdToolbar";
import { uuid } from "@/utils/uuid";

export function PreviewToolbar() {
    const { outputFormat } = useSnapshot(mermaidSettings);
    const setOpenExport = useSetAtom(isOpenExportDialogAtom);
    const isFlow = outputFormat === 'flow';
    const isMmd = outputFormat === 'mmd';

    return (
        <div className="px-3 h-9 bg-muted/30 border-b border-border flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                    Preview
                </span>

                <Tabs value={outputFormat} onValueChange={(v) => { mermaidSettings.outputFormat = v as OutputFormat; }}>
                    <TabsList className="p-0.5 h-6!">
                        <TabsTrigger value="mmd" className="px-2 text-[.7rem]">Mermaid</TabsTrigger>
                        <TabsTrigger value="flow" className="px-2 text-[.7rem]">Flow</TabsTrigger>
                        <TabsTrigger value="svg" className="px-2 text-[.7rem]">SVG</TabsTrigger>
                        <TabsTrigger value="text" className="px-2 text-[.7rem]">Text</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="flex items-center">
                {isFlow
                    ? <FlowToolbarActions />
                    : isMmd
                        ? <MmdToolbarActions />
                        : (<>
                            <Button variant="ghost" size="xs" onClick={() => copyCurrentOutput()} title={`Copy ${outputFormat === 'svg' ? 'SVG markup' : 'text'} to clipboard`}>
                                <CopyIcon />
                            </Button>

                            <RenderOptionsPopover />

                            <Button variant="ghost" size="xs" onClick={() => setOpenExport(true)} title="Export as SVG, text or PNG">
                                <DownloadIcon />
                            </Button>
                        </>)}
            </div>
        </div>
    );
}

function FlowToolbarActions() {
    const setLoadOpen = useSetAtom(rflowLoadDialogOpenAtom);
    const methods = useAtomValue(rflowCanvasMethodsAtom);

    return (<>
        <Button variant="ghost" size="xs" onClick={saveCurrentFlow} title="Save diagram (Mermaid + canvas layout)">
            <SaveIcon />
        </Button>
        <Button variant="ghost" size="xs" onClick={() => setLoadOpen(true)} title="Load a saved diagram">
            <FolderOpenIcon />
        </Button>
        <Button variant="ghost" size="xs" onClick={exportFlowJson} title="Export JSON">
            <DownloadIcon />
        </Button>
        <Button variant="ghost" size="xs" onClick={() => void methods.exportImage?.()} title="Export canvas PNG">
            <ImageIcon />
        </Button>
    </>);
}

function saveCurrentFlow() {
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

function exportFlowJson() {
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

/** Quick copy in the currently selected preview format (self-contained colors). */
async function copyCurrentOutput() {
    try {
        const bm = await loadBeautifulMermaid();
        const { source, outputFormat, diagramTheme, ascii, svg, exportFlattenColors, exportIncludeFontImport } = mermaidSettings;
        const result = renderDiagram(
            bm,
            source,
            { diagramTheme, ascii, svg },
            outputFormat === 'text' ? 'text' : 'svg',
            {
                flattenColors: exportFlattenColors,
                includeFontImport: exportIncludeFontImport,
            },
        );

        if (result.error) {
            toast.error(`Cannot copy: ${result.error}`);
            return;
        }
        if (!result.output) {
            toast.message('Nothing to copy: the diagram is empty.');
            return;
        }

        await copyText(result.output);
        toast.success(outputFormat === 'svg' ? 'SVG copied to clipboard' : 'Text copied to clipboard');
    } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
    }
}
