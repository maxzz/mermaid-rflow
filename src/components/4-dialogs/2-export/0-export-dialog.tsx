import { Suspense, use, useMemo, useState } from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { toast } from "sonner";
import { CopyIcon, DownloadIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/ui/shadcn/tabs";
import { BarsLoaderIcon } from "@/ui/local-ui";

import { type ExportFormat, mermaidSettings, type PngScale } from "@/store/2-mermaid-settings";
import { renderDiagram, type RenderResult } from "@/store/5-render-diagram/5-render";
import { loadBeautifulMermaid } from "@/components/2-main/2-editor-page/1-panel-editor/8-lazy-modules";
import { copyPngBlob, copyText, downloadBlob, downloadText, getSvgNaturalSize } from "@/components/4-dialogs/2-export/8-export-utils";
import { ErrorBoundary } from "@/ui/local-ui/8-error-boundary";
import { Switch } from "@/ui/shadcn/switch";
import { isOpenExportDialogAtom } from "./a-types-export";
import { ExportPreview, usePngPreview } from "./1-export-preview";

export function ExportDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenExportDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! max-w-2xl! gap-0!" aria-describedby={DESCRIPTION_ID}>
                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm">
                        Export diagram
                    </DialogTitle>
                    <DialogDescription id={DESCRIPTION_ID} className="sr-only">
                        Choose a format, preview the result, then copy it to the clipboard or download it as a file.
                    </DialogDescription>
                </DialogHeader>

                <ErrorBoundary fallback={<div className="p-6 text-xs text-destructive">Failed to load the diagram renderer.</div>}>
                    <Suspense fallback={<div className="py-12 flex justify-center"><BarsLoaderIcon /></div>}>
                        <Body />
                    </Suspense>
                </ErrorBoundary>
            </DialogContent>
        </Dialog>
    );
}

const DESCRIPTION_ID = "export-dialog-description";

function Body() {
    const bm = use(loadBeautifulMermaid());
    const { source, outputFormat, diagramTheme, ascii, svg, pngScale, exportFlattenColors, exportIncludeFontImport } = useSnapshot(mermaidSettings);

    // Start from the format currently shown in the preview pane
    const [format, setFormat] = useState<ExportFormat>(outputFormat);

    const renderResult = useMemo(
        () => renderDiagram(
            bm,
            source,
            { diagramTheme, ascii, svg },
            format === 'text' ? 'text' : 'svg',
            {
                flattenColors: exportFlattenColors,
                includeFontImport: exportIncludeFontImport,
            },
        ),
        [bm, source, diagramTheme, ascii, svg, format, exportFlattenColors, exportIncludeFontImport]);

    const png = usePngPreview(format === 'png' ? renderResult : null, pngScale);
    const [busy, setBusy] = useState(false);

    const canExport = !renderResult.error && !!renderResult.output && (format !== 'png' || !!png.blob);

    async function run(action: 'copy' | 'download') {
        setBusy(true);
        try {
            await doExport(action, format, renderResult, png.blob, pngScale);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    }

    return (<>
        <div className="px-4 py-3 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <Tabs value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                    <TabsList className="h-7!">
                        {EXPORT_FORMATS.map(
                            (f) => (
                                <TabsTrigger key={f.value} value={f.value} className="px-3">
                                    {f.label}
                                </TabsTrigger>
                            )
                        )}
                    </TabsList>
                </Tabs>

                {format === 'png' && (
                    <TabPngScaleMultipliers value={pngScale} onChange={(v) => { mermaidSettings.pngScale = v; }} />
                )}
            </div>

            <ExportPreview format={format} result={renderResult} pngUrl={png.url} pngSize={png.size} />

            {format !== 'text' && (
                <ExportSvgOptions format={format} flatten={exportFlattenColors} fontImport={exportIncludeFontImport} />
            )}

            <div className="text-[.7rem] text-muted-foreground">
                {describeOutput(format, renderResult, png.size)}
            </div>
        </div>

        <DialogFooter className="px-4 py-3 mx-0! mb-0! flex flex-row items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => run('copy')} disabled={!canExport || busy} title="Copy to clipboard">
                <CopyIcon />
                Copy
            </Button>
            <Button size="sm" onClick={() => run('download')} disabled={!canExport || busy} title="Download file">
                <DownloadIcon />
                Download .{EXPORT_FORMATS.find((f) => f.value === format)?.ext}
            </Button>
        </DialogFooter>
    </>);
}

//---------------------------------------------------------------------------
// Tabs: 1x, 2x, 4x

function TabPngScaleMultipliers({ value, onChange }: { value: PngScale; onChange: (v: PngScale) => void; }) {
    return (
        <div className="flex items-center gap-1">
            <span className="mr-1 text-[.7rem] text-muted-foreground">
                Size
            </span>
            {PNG_SCALES.map(
                (scale) => (
                    <Button
                        key={scale}
                        variant={scale === value ? 'secondary' : 'ghost'}
                        size="xs"
                        className="px-2 font-mono"
                        onClick={() => onChange(scale)}
                        aria-pressed={scale === value}
                    >
                        {scale}x
                    </Button>
                )
            )}
        </div>
    );
}

const PNG_SCALES: PngScale[] = [1, 2, 4];

//---------------------------------------------------------------------------
// SVG export toggles

function ExportSvgOptions({ format, flatten, fontImport }: { format: ExportFormat; flatten: boolean; fontImport: boolean; }) {
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <ExportSwitch
                label="Flatten colors"
                hint="Bake CSS variables, color-mix(), and oklch() to hex so the file looks the same in any viewer. Turn off to keep the live CSS as-is."
                checked={flatten}
                onChange={(v) => { mermaidSettings.exportFlattenColors = v; }}
            />
            {format === 'svg' && (
                <ExportSwitch
                    label="Font import"
                    hint="Include a Google Fonts @import in the SVG. Turn off for offline files or fonts that are already installed (such as Geist)."
                    checked={fontImport}
                    onChange={(v) => { mermaidSettings.exportIncludeFontImport = v; }}
                />
            )}
        </div>
    );
}

function ExportSwitch({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; }) {
    return (
        <label className="text-[.7rem] text-muted-foreground inline-flex gap-2 items-center cursor-pointer" title={hint}>
            <Switch size="sm" checked={checked} onCheckedChange={onChange} />
            {label}
        </label>
    );
}

//---------------------------------------------------------------------------
// do export

async function doExport(action: 'copy' | 'download', format: ExportFormat, result: RenderResult, pngBlob: Blob | null, pngScale: PngScale) {
    const def = EXPORT_FORMATS.find((f) => f.value === format)!;
    const filename = `${EXPORT_FILENAME}.${def.ext}`;

    if (format === 'png') {
        if (!pngBlob) {
            throw new Error('PNG is not ready yet.');
        }
        if (action === 'copy') {
            await copyPngBlob(pngBlob);
            toast.success(`PNG image copied to clipboard (${pngScale}x)`);
        } else {
            downloadBlob(pngBlob, filename);
            toast.success(`Saved ${filename} (${pngScale}x)`);
        }
        return;
    }

    if (action === 'copy') {
        await copyText(result.output);
        toast.success(format === 'svg' ? 'SVG markup copied to clipboard' : 'Text copied to clipboard');
    } else {
        downloadText(result.output, filename, def.mime);
        toast.success(`Saved ${filename}`);
    }
}

const EXPORT_FORMATS: { value: ExportFormat; label: string; ext: string; mime: string; }[] = [
    { value: 'svg', label: 'SVG', ext: 'svg', mime: 'image/svg+xml' },
    { value: 'text', label: 'Text', ext: 'txt', mime: 'text/plain' },
    { value: 'png', label: 'PNG', ext: 'png', mime: 'image/png' },
];

const EXPORT_FILENAME = 'diagram';

//---------------------------------------------------------------------------
// Describe output information

function describeOutput(format: ExportFormat, result: RenderResult, pngSize: { w: number; h: number; } | null): string {
    if (result.error || !result.output) {
        return '';
    }
    if (format === 'png') {
        return pngSize ? `PNG ${pngSize.w} x ${pngSize.h} px` : 'Rendering PNG...';
    }
    if (format === 'text') {
        const lines = result.output.split('\n').length;
        return `${lines} lines, ${formatBytes(result.output.length)}`;
    }
    const { w, h } = getSvgNaturalSize(result.output);
    return `SVG ${Math.round(w)} x ${Math.round(h)} px, ${formatBytes(result.output.length)}`;
}

function formatBytes(n: number): string {
    return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
}
