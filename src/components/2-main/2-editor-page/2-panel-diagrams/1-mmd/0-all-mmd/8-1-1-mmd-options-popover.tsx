import { type ReactNode, useId } from 'react';
import { useSnapshot } from 'valtio';
import { Settings2Icon } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import { Label } from '@/ui/shadcn/label';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/ui/shadcn/popover';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/ui/shadcn/select';
import { Switch } from '@/ui/shadcn/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/shadcn/tooltip';
import { PreviewSelectItem, useSelectPreview } from '@/ui/local-ui';
import { mermaidSettings } from '@/store/2-mermaid-settings';

import { classifyMermaidSource, readDirection, type FlowDirection } from '../3-catalog/1-flowchart-source';
import { setDirection } from '../3-catalog/2-source-patch';
import { applyMmdPatchResult } from '../3-catalog/4-apply-patch';
import { MMD_LOOKS, MMD_THEME_LABELS, MMD_THEMES, type MmdLook, type MmdTheme } from '../1-2-render/8-themes';
import { type MmdLayout } from '../1-2-render/3-render-layout';
import { mmdSettings } from '../8-store/2-mmd-settings';

export function MmdOptionsPopover() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="xs" title="Mermaid options" type="button">
                    <Settings2Icon />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="p-3 pt-0 w-80 max-h-[min(70vh,32rem)] rounded-sm overflow-y-auto"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={keepOpenForSelect}
            >
                <PopoverHeader>
                    <PopoverTitle className="-mx-3 px-3 pt-3 pb-2 text-xs font-medium bg-muted border-b border-border shadow-xs">
                        Mermaid options
                    </PopoverTitle>
                    <PopoverDescription className="text-[0.65rem] text-muted-foreground sr-only">
                        Official Mermaid theme, look, layout engine, flowchart direction, and fit.
                    </PopoverDescription>
                </PopoverHeader>

                <TooltipProvider delayDuration={500}>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2 gap-y-2 items-center">
                        <MmdViewOptions />
                    </div>
                </TooltipProvider>
            </PopoverContent>
        </Popover>
    );
}

function MmdViewOptions() {
    const { source } = useSnapshot(mermaidSettings);
    const { theme, adaptive, look, layout, autofit } = useSnapshot(mmdSettings);
    const flowchart = classifyMermaidSource(source) === 'flowchart';
    const direction = readDirection(source) ?? 'TD';
    const themeSelect = useSelectPreview(theme, (v) => { mmdSettings.theme = v as MmdTheme; });
    const lookSelect = useSelectPreview(look, (v) => { mmdSettings.look = v as MmdLook; });
    const layoutSelect = useSelectPreview(layout, (v) => { mmdSettings.layout = v as MmdLayout; });
    const directionSelect = useSelectPreview(direction, (v) => applyMmdPatchResult(setDirection(mermaidSettings.source, v as FlowDirection)));

    return (
        <>
            <Row label="Theme" hint="Color palette for the official Mermaid renderer. Adaptive pairs follow the app light or dark theme.">
                <PreviewSelect select={themeSelect} liveLabel={MMD_THEME_LABELS[theme]}>
                    {MMD_THEMES.map((name) => (
                        <PreviewSelectItem key={name} value={name} onPreview={themeSelect.preview}>
                            {MMD_THEME_LABELS[name]}
                        </PreviewSelectItem>
                    ))}
                </PreviewSelect>
            </Row>

            <Row label="Adaptive to app theme" hint="Follow the app light or dark theme when choosing a paired Mermaid palette.">
                <Switch className="-mr-1 scale-65" checked={adaptive} onCheckedChange={(v) => { mmdSettings.adaptive = v; }} />
            </Row>

            <Row label="Look" hint="Classic, hand-drawn, or neo rendering style.">
                <PreviewSelect select={lookSelect} liveLabel={MMD_LOOKS.find((item) => item.value === look)?.label ?? look}>
                    {MMD_LOOKS.map((item) => (
                        <PreviewSelectItem key={item.value} value={item.value} onPreview={lookSelect.preview}>
                            {item.label}
                        </PreviewSelectItem>
                    ))}
                </PreviewSelect>
            </Row>

            <Row label="Layout" hint="ELK is what mermaid.ai uses: straighter orthogonal edges. Dagre is the older engine with rounded Bézier links.">
                <PreviewSelect select={layoutSelect} liveLabel={LAYOUTS.find((item) => item.value === layout)?.label ?? layout}>
                    {LAYOUTS.map((item) => (
                        <PreviewSelectItem key={item.value} value={item.value} onPreview={layoutSelect.preview}>
                            {item.label}
                        </PreviewSelectItem>
                    ))}
                </PreviewSelect>
            </Row>

            <Row label="Direction" hint="Flowchart layout direction. Disabled for non-flowchart diagrams.">
                <PreviewSelect
                    select={directionSelect}
                    liveLabel={DIRECTIONS.find((item) => item.value === direction)?.label ?? direction}
                    disabled={!flowchart}
                >
                    {DIRECTIONS.map((item) => (
                        <PreviewSelectItem key={item.value} value={item.value} onPreview={directionSelect.preview}>
                            {item.label}
                        </PreviewSelectItem>
                    ))}
                </PreviewSelect>
            </Row>

            <Row label="Autofit" hint="Scale the diagram to the pane. Zooming or panning turns this off.">
                <Switch className="-mr-1 scale-65" checked={autofit} onCheckedChange={(v) => { mmdSettings.autofit = v; }} />
            </Row>
        </>
    );
}

const LAYOUTS: { value: MmdLayout; label: string; }[] = [
    { value: 'elk', label: 'ELK' },
    { value: 'dagre', label: 'Dagre' },
];

const DIRECTIONS: { value: FlowDirection; label: string; }[] = [
    { value: 'TD', label: 'Top to bottom' },
    { value: 'BT', label: 'Bottom to top' },
    { value: 'LR', label: 'Left to right' },
    { value: 'RL', label: 'Right to left' },
];

type SelectPreview = ReturnType<typeof useSelectPreview>;

function PreviewSelect({
    select,
    liveLabel,
    disabled,
    children,
}: {
    select: SelectPreview;
    liveLabel: string;
    disabled?: boolean;
    children: ReactNode;
}) {
    return (
        <Select value={select.listValue} open={select.open} onOpenChange={select.onOpenChange} onValueChange={select.onValueChange} disabled={disabled}>
            <SelectTrigger size="sm" className="w-40" disabled={disabled}>
                <SelectValue>{liveLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" align="end">
                {children}
            </SelectContent>
        </Select>
    );
}

const optionRowClasses = "col-span-full grid grid-cols-subgrid items-center min-h-6";

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode; }) {
    const id = useId();
    return (
        <div className={optionRowClasses}>
            <HintLabel htmlFor={id} hint={hint}>
                {label}
            </HintLabel>
            <div id={id} className="col-span-2 justify-self-end">
                {children}
            </div>
        </div>
    );
}

function HintLabel({ htmlFor, hint, children }: { htmlFor?: string; hint: string; children: ReactNode; }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Label htmlFor={htmlFor} className="whitespace-nowrap font-normal cursor-help">
                    {children}
                </Label>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8} className="max-w-56 whitespace-normal text-left z-100">
                {hint}
            </TooltipContent>
        </Tooltip>
    );
}

function keepOpenForSelect(event: { target: EventTarget | null; preventDefault: () => void; }) {
    const el = event.target as HTMLElement | null;
    if (el?.closest?.('[data-slot="select-content"]')) {
        event.preventDefault();
    }
}
