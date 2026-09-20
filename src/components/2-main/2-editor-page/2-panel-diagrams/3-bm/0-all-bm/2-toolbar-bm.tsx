import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { toast } from "sonner";
import { CopyIcon, DownloadIcon } from "lucide-react";
import { mermaidSettings, OutputFormat } from "@/store/2-mermaid-settings";
import { renderDiagram } from "@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/5-render-diagram/5-render";
import { loadBeautifulMermaid } from "@/components/2-main/2-editor-page/1-panel-editor/8-lazy-modules";
import { copyText } from "@/components/4-dialogs/2-export/8-export-utils";
import { isOpenExportDialogAtom } from "@/components/4-dialogs/2-export/a-types-export";
import { Button } from "@/ui/shadcn/button";
import { RenderOptionsPopover } from "../../0-all-panels/6-render-options-popover";

export function PreviewToolbar_Bm() {
    const { outputFormat } = useSnapshot(mermaidSettings);
    const setOpenExport = useSetAtom(isOpenExportDialogAtom);

    return (<>
        <Button variant="ghost" size="xs" onClick={() => copyCurrentOutput()} title={`Copy ${outputFormat === OutputFormat.svg ? "SVG markup" : "text"} to clipboard`}>
            <CopyIcon />
        </Button>

        <RenderOptionsPopover />

        <Button variant="ghost" size="xs" onClick={() => setOpenExport(true)} title="Export as SVG, text or PNG">
            <DownloadIcon />
        </Button>
    </>);
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
            outputFormat === OutputFormat.text ? OutputFormat.text : OutputFormat.svg,
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
            toast.message("Nothing to copy: the diagram is empty.");
            return;
        }

        await copyText(result.output);
        toast.success(outputFormat === OutputFormat.svg ? "SVG copied to clipboard" : "Text copied to clipboard");
    } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
    }
}
