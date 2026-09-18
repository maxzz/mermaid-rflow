import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { toast } from "sonner";
import { CopyIcon, DownloadIcon } from "lucide-react";
import { mermaidSettings, type OutputFormat } from "@/store/2-mermaid-settings";
import { renderDiagram } from "@/store/5-render-diagram/5-render";
import { loadBeautifulMermaid } from "@/components/2-main/2-editor-page/1-panel-editor/8-lazy-modules";
import { copyText } from "@/components/4-dialogs/2-export/8-export-utils";
import { isOpenExportDialogAtom } from "@/components/4-dialogs/2-export/a-types-export";
import { Button } from "@/ui/shadcn/button";
import { Tabs, TabsList, TabsTrigger } from "@/ui/shadcn/tabs";
import { RenderOptionsPopover } from "./6-render-options-popover";

export function PreviewToolbar() {
    const { outputFormat } = useSnapshot(mermaidSettings);
    const setOpenExport = useSetAtom(isOpenExportDialogAtom);

    return (
        <div className="px-3 h-9 bg-muted/30 border-b border-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                    Preview
                </span>

                <Tabs value={outputFormat} onValueChange={(v) => { mermaidSettings.outputFormat = v as OutputFormat; }}>
                    <TabsList className="p-0.5 h-6!">
                        <TabsTrigger value="svg" className="px-2 text-[.7rem]">SVG</TabsTrigger>
                        <TabsTrigger value="text" className="px-2 text-[.7rem]">Text</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="flex items-center">
                <Button variant="ghost" size="xs" onClick={() => copyCurrentOutput()} title={`Copy ${outputFormat === 'svg' ? 'SVG markup' : 'text'} to clipboard`}>
                    <CopyIcon />
                </Button>

                <RenderOptionsPopover />

                <Button variant="ghost" size="xs" onClick={() => setOpenExport(true)} title="Export as SVG, text or PNG">
                    <DownloadIcon />
                </Button>
            </div>
        </div>
    );
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
            outputFormat,
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
