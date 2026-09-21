import { useState } from 'react';
import { useSnapshot } from 'valtio';
import { classNames } from '@/utils';
import { Button } from '@/ui/shadcn/button';
import { Label } from '@/ui/shadcn/label';
import { Slider } from '@/ui/shadcn/slider';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/ui/shadcn/popover';
import { PaintbrushIcon } from 'lucide-react';

import { type LineDash } from '../catalog/6-mmd-style';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { sourceLink } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { applySelectedStroke, readSelectedStroke, selectedMmdTarget } from '../catalog/4-apply-patch';

export function MmdStylePopover({ enabled }: { enabled: boolean; }) {
    useSnapshot(mermaidSettings);
    useSnapshot(sourceLink);

    const [open, setOpen] = useState(false);
    const selected = selectedMmdTarget();
    const stroke = selected ? readSelectedStroke() : null;
    const title = selected?.kind === 'edge' ? 'Line style' : 'Block style';
    const color = hexColor(stroke?.color);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!enabled || !selected}
                    aria-label="Style"
                    title={selected ? `Style ${selected.kind === 'edge' ? 'selected line' : `block ${selected.id}`}` : 'Select a block or line to style'}
                >
                    <PaintbrushIcon />
                </Button>
            </PopoverTrigger>

            <PopoverContent side="right" align="center" className="p-3 w-56">
                <PopoverHeader>
                    <PopoverTitle>{title}</PopoverTitle>
                    <PopoverDescription className="text-[0.65rem] text-muted-foreground">
                        {selected?.kind === 'edge'
                            ? `Applies to ${selected.from} → ${selected.to}.`
                            : selected
                                ? `Applies to block ${selected.id}.`
                                : 'Select a block or line first.'}
                    </PopoverDescription>
                </PopoverHeader>

                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[0.65rem] text-muted-foreground">
                            Color
                        </Label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                className="size-7 rounded-sm border border-border bg-background p-0.5 cursor-pointer"
                                value={color}
                                onChange={(e) => applySelectedStroke({ color: e.target.value })}
                                aria-label="Color"
                            />
                            <div className="flex flex-wrap gap-1">
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        className={classNames(
                                            'size-4 rounded-sm border border-border',
                                            color.toLowerCase() === preset && 'ring-1 ring-ring',
                                        )}
                                        style={{ background: preset }}
                                        title={preset}
                                        onClick={() => applySelectedStroke({ color: preset })}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[0.65rem] text-muted-foreground">
                            Width {stroke?.width ?? 2}px
                        </Label>
                        <Slider
                            min={1}
                            max={8}
                            step={1}
                            value={[stroke?.width ?? 2]}
                            onValueChange={(value) => {
                                const width = value[0];
                                if (width != null) {
                                    applySelectedStroke({ width });
                                }
                            }}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[0.65rem] text-muted-foreground">
                            Style
                        </Label>
                        <div className="grid grid-cols-3 gap-1">
                            {DASHES.map((item) => (
                                <Button
                                    key={item.value}
                                    type="button"
                                    variant={stroke?.dash === item.value ? 'secondary' : 'ghost'}
                                    size="xs"
                                    onClick={() => applySelectedStroke({ dash: item.value })}
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

const PRESETS = ['#64748b', '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0f172a'];
const DASHES: { value: LineDash; label: string; }[] = [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' },
];

function hexColor(raw: string | null | undefined): string {
    if (raw && /^#([\da-f]{6})$/i.test(raw)) {
        return raw;
    }
    if (raw && /^#([\da-f]{3})$/i.test(raw)) {
        const [r, g, b] = raw.slice(1);
        return `#${r}${r}${g}${g}${b}${b}`;
    }
    return '#64748b';
}
