import { useAtom } from 'jotai';
import { useSnapshot } from 'valtio';
import { toast } from 'sonner';
import { CircleIcon, CopyIcon, DiamondIcon, DownloadIcon, PillIcon, SquareIcon } from 'lucide-react';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { sourceLink } from '@/store/6-source-render-links';
import { copyText, downloadText } from '@/components/4-dialogs/2-export/8-export-utils';
import { Button } from '@/ui/shadcn/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/shadcn/select';
import { Switch } from '@/ui/shadcn/switch';
import { classifyMermaidSource, readDirection, type FlowDirection, type NodeShape } from '../catalog/1-flowchart-source';
import { addNode, setDirection } from '../catalog/2-source-patch';
import { applyMmdPatchResult } from '../catalog/4-apply-patch';
import { MMD_LOOKS, MMD_THEME_LABELS, MMD_THEMES, type MmdLook, type MmdTheme } from '../render/1-themes';
import { mmdDiagram } from '../store/1-mmd-diagram';
import { mmdSettings } from '../store/2-mmd-settings';
import { mmdPaletteShapeAtom } from '../store/3-mmd-ui';

const DIRECTIONS: { value: FlowDirection; label: string; }[] = [
    { value: 'TD', label: 'Top to bottom' },
    { value: 'BT', label: 'Bottom to top' },
    { value: 'LR', label: 'Left to right' },
    { value: 'RL', label: 'Right to left' },
];

const SHAPES: { value: NodeShape; label: string; icon: typeof SquareIcon; }[] = [
    { value: 'rect', label: 'Rectangle', icon: SquareIcon },
    { value: 'diamond', label: 'Diamond', icon: DiamondIcon },
    { value: 'stadium', label: 'Stadium', icon: PillIcon },
    { value: 'circle', label: 'Circle', icon: CircleIcon },
];

export function MmdToolbarActions() {
    const { source } = useSnapshot(mermaidSettings);
    const { theme, adaptive, look, autofit } = useSnapshot(mmdSettings);
    const { svg, error } = useSnapshot(mmdDiagram);
    const link = useSnapshot(sourceLink);
    const [shape, setShape] = useAtom(mmdPaletteShapeAtom);
    const flowchart = classifyMermaidSource(source) === 'flowchart';
    const direction = readDirection(source) ?? 'TD';

    return (
        <div className="min-w-0 flex items-center gap-1">
            <Select value={theme} onValueChange={(v) => { mmdSettings.theme = v as MmdTheme; }}>
                <SelectTrigger size="sm" className="h-6 max-w-36 px-1.5 text-[.7rem] border-transparent shadow-none">
                    <SelectValue>{MMD_THEME_LABELS[theme]}</SelectValue>
                </SelectTrigger>
                <SelectContent position="popper" align="end">
                    {MMD_THEMES.map((name) => (
                        <SelectItem key={name} value={name}>{MMD_THEME_LABELS[name]}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <label className="px-1 text-[.7rem] text-muted-foreground flex items-center gap-1" title="Follow the app light or dark theme">
                Adaptive
                <Switch size="sm" checked={adaptive} onCheckedChange={(v) => { mmdSettings.adaptive = v; }} />
            </label>

            <Select value={look} onValueChange={(v) => { mmdSettings.look = v as MmdLook; }}>
                <SelectTrigger size="sm" className="h-6 max-w-28 px-1.5 text-[.7rem] border-transparent shadow-none">
                    <SelectValue>{MMD_LOOKS.find((item) => item.value === look)?.label ?? look}</SelectValue>
                </SelectTrigger>
                <SelectContent position="popper" align="end">
                    {MMD_LOOKS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                value={direction}
                onValueChange={(v) => applyMmdPatchResult(setDirection(mermaidSettings.source, v as FlowDirection))}
                disabled={!flowchart}
            >
                <SelectTrigger size="sm" className="h-6 max-w-36 px-1.5 text-[.7rem] border-transparent shadow-none" disabled={!flowchart}>
                    <SelectValue>{DIRECTIONS.find((item) => item.value === direction)?.label ?? direction}</SelectValue>
                </SelectTrigger>
                <SelectContent position="popper" align="end">
                    {DIRECTIONS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <label className="px-1 text-[.7rem] text-muted-foreground flex items-center gap-1" title="Scale the diagram to the pane">
                Autofit
                <Switch size="sm" checked={autofit} onCheckedChange={(v) => { mmdSettings.autofit = v; }} />
            </label>

            {flowchart && (
                <div className="flex items-center">
                    {SHAPES.map((item) => (
                        <Button
                            key={item.value}
                            variant="ghost"
                            size="icon-xs"
                            className={shape === item.value ? 'bg-muted text-foreground' : undefined}
                            title={`Add ${item.label.toLowerCase()}`}
                            onClick={() => {
                                setShape(item.value);
                                const selected = firstSelectedNodeId(link.keys as string[]);
                                applyMmdPatchResult(addNode(mermaidSettings.source, { shape: item.value, fromId: selected ?? undefined }));
                            }}
                        >
                            <item.icon />
                        </Button>
                    ))}
                </div>
            )}

            <Button variant="ghost" size="xs" onClick={() => void copyOfficialSvg(svg, error)} title="Copy official Mermaid SVG">
                <CopyIcon />
            </Button>
            <Button variant="ghost" size="xs" onClick={() => downloadOfficialSvg(svg, error)} title="Download official Mermaid SVG">
                <DownloadIcon />
            </Button>
        </div>
    );
}

function firstSelectedNodeId(keys: string[]): string | null {
    for (const key of keys) {
        if (key.startsWith('node:')) {
            return key.slice('node:'.length);
        }
    }
    return null;
}

async function copyOfficialSvg(svg: string, error: string | null) {
    if (error) {
        toast.error(`Cannot copy: ${error}`);
        return;
    }
    if (!svg) {
        toast.message('Nothing to copy: the diagram is empty.');
        return;
    }
    await copyText(svg);
    toast.success('SVG copied to clipboard');
}

function downloadOfficialSvg(svg: string, error: string | null) {
    if (error) {
        toast.error(`Cannot download: ${error}`);
        return;
    }
    if (!svg) {
        toast.message('Nothing to download: the diagram is empty.');
        return;
    }
    downloadText(svg, 'diagram.svg', 'image/svg+xml');
    toast.success('Downloaded SVG');
}
