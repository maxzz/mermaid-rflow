import { type FormEvent, useState } from 'react';
import { useSetAtom } from 'jotai';
import { useSnapshot } from 'valtio';
import { CloudIcon, ImageIcon, ShapesIcon, VideoIcon } from 'lucide-react';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { sourceLink } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { classNames } from '@/utils';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { Label } from '@/ui/shadcn/label';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/ui/shadcn/popover';
import { classifyMermaidSource, FLOW_SHAPE_ITEMS, type NodeShape } from '../3-catalog/1-flowchart-source';
import { insertMmdPaletteNode, selectedMmdNodeId } from '../3-catalog/4-apply-patch';
import { mmdPaletteShapeAtom } from '../8-store/3-mmd-ui-atoms';
import { MmdStylePopover } from './8-1-2-1-mmd-style-panel';

export function MmdPaletteRail() {
    const { source } = useSnapshot(mermaidSettings);
    useSnapshot(sourceLink);
    const kind = classifyMermaidSource(source);
    const enabled = kind === 'flowchart' || kind === 'empty';
    const selected = selectedMmdNodeId();
    const applyTitle = selected ? `Change selected block (${selected})` : 'Add a shape';

    return (
        <div
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 p-1 bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-md flex flex-col gap-0.5"
            role="toolbar"
            aria-label="Shapes"
            data-mmd-chrome=""
        >
            <ShapePopover enabled={enabled} selected={selected} applyTitle={applyTitle} />
            
            <MmdStylePopover enabled={enabled} />
            
            <IconPopover enabled={enabled} />

            <UrlPopover
                enabled={enabled}
                title="Image"
                description="Insert a flowchart image node from a URL."
                label="Image URL"
                placeholder="https://example.com/picture.png"
                triggerTitle="Add image"
                TriggerIcon={ImageIcon}
                onAdd={(src) => insertMmdPaletteNode({ shape: 'image', src, label: 'Image' })}
            />

            <UrlPopover
                enabled={enabled}
                title="Video"
                description="Insert a YouTube thumbnail, or a browser-shaped placeholder."
                label="Video URL"
                placeholder="https://youtu.be/…"
                triggerTitle="Add video"
                TriggerIcon={VideoIcon}
                allowEmpty
                emptyLabel="Add without URL"
                onAdd={(src) => insertMmdPaletteNode({ shape: 'video', src: src || undefined, label: 'Video' })}
            />
        </div>
    );
}

function ShapePopover({ enabled, selected, applyTitle }: { enabled: boolean; selected: string | null; applyTitle: string; }) {
    const setShape = useSetAtom(mmdPaletteShapeAtom);
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-sm" disabled={!enabled} title={applyTitle} aria-label={applyTitle}>
                    <ShapesIcon />
                </Button>
            </PopoverTrigger>

            <PopoverContent side="right" align="center" className="p-2 w-56">
                <PopoverHeader>
                    <PopoverTitle>{selected ? 'Change shape' : 'Shapes'}</PopoverTitle>
                    <PopoverDescription className="text-[0.65rem] text-muted-foreground">
                        {selected ? `Applies to selected block ${selected}. Click empty canvas to add a new one.` : 'Adds a new block. Select a block first to change its shape.'}
                    </PopoverDescription>
                </PopoverHeader>

                <div className="grid grid-cols-2 gap-1">
                    {FLOW_SHAPE_ITEMS.map(
                        (item) => (
                            <Button
                                className="h-7 justify-start px-2 text-[.7rem]"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShape(item.value);
                                    insertMmdPaletteNode({ shape: item.value });
                                    setOpen(false);
                                }}
                                key={item.value}
                            >
                                <ShapePreview shape={item.value} />
                                {item.label}
                            </Button>
                        )
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

function ShapePreview({ shape }: { shape: NodeShape; }) {
    return (
        <span
            className={classNames(
                'size-2.5 border border-current opacity-70',
                shape === 'circle' || shape === 'dbl-circ' ? 'rounded-full' : undefined,
                shape === 'stadium' || shape === 'rounded' ? 'rounded-full' : undefined,
                shape === 'diamond' || shape === 'hex' ? 'rotate-45' : undefined,
                shape === 'text' ? 'border-0 font-serif text-[0.6rem] leading-none opacity-100' : undefined,
            )}
            aria-hidden
        >
            {shape === 'text' ? 'T' : null}
        </span>
    );
}

function IconPopover({ enabled }: { enabled: boolean; }) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-sm" disabled={!enabled} title="Add an icon" aria-label="Add an icon">
                    <CloudIcon />
                </Button>
            </PopoverTrigger>

            <PopoverContent side="right" align="center" className="p-2 w-52">
                <PopoverHeader>
                    <PopoverTitle>Icons</PopoverTitle>
                    <PopoverDescription className="text-[0.65rem] text-muted-foreground">
                        Inserted as mermaid <span className="font-mono">fa:fa-*</span> labels.
                    </PopoverDescription>
                </PopoverHeader>

                <div className="grid grid-cols-2 gap-1">
                    {ICONS.map(
                        (item) => (
                            <Button
                                key={item.icon}
                                variant="ghost"
                                size="sm"
                                className="h-7 justify-start px-2 text-[.7rem]"
                                onClick={() => {
                                    insertMmdPaletteNode({ shape: 'icon', icon: item.icon, label: item.label });
                                    setOpen(false);
                                }}
                            >
                                {item.label}
                            </Button>
                        )
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

const ICONS: { icon: string; label: string; }[] = [
    { icon: 'fa:fa-star', label: 'Star' },
    { icon: 'fa:fa-user', label: 'User' },
    { icon: 'fa:fa-heart', label: 'Heart' },
    { icon: 'fa:fa-check', label: 'Check' },
    { icon: 'fa:fa-car', label: 'Car' },
    { icon: 'fa:fa-home', label: 'Home' },
    { icon: 'fa:fa-envelope', label: 'Mail' },
    { icon: 'fa:fa-cog', label: 'Settings' },
    { icon: 'fa:fa-bell', label: 'Bell' },
    { icon: 'fa:fa-flag', label: 'Flag' },
    { icon: 'fa:fa-cloud', label: 'Cloud' },
    { icon: 'fa:fa-image', label: 'Image' },
];

function UrlPopover({ enabled, title, description, label, placeholder, triggerTitle, TriggerIcon, onAdd, allowEmpty, emptyLabel }: {
    enabled: boolean;
    title: string;
    description: string;
    label: string;
    placeholder: string;
    triggerTitle: string;
    TriggerIcon: typeof ImageIcon;
    onAdd: (src: string) => void;
    allowEmpty?: boolean;
    emptyLabel?: string;
}) {
    const [open, setOpen] = useState(false);
    const [src, setSrc] = useState('');

    function submit(e: FormEvent) {
        e.preventDefault();
        const value = src.trim();
        if (!value && !allowEmpty) {
            return;
        }
        onAdd(value);
        setSrc('');
        setOpen(false);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-sm" disabled={!enabled} title={triggerTitle} aria-label={triggerTitle}>
                    <TriggerIcon />
                </Button>
            </PopoverTrigger>

            <PopoverContent side="right" align="center" className="p-3 w-64">
                <PopoverHeader>
                    <PopoverTitle>{title}</PopoverTitle>
                    <PopoverDescription className="text-[0.65rem] text-muted-foreground">{description}</PopoverDescription>
                </PopoverHeader>

                <form className="flex flex-col gap-2" onSubmit={submit}>
                    <Label className="text-[0.65rem] text-muted-foreground">{label}</Label>
                    <Input value={src} onChange={(e) => setSrc(e.target.value)} placeholder={placeholder} className="h-7 text-[.7rem]" />
                    <div className="flex justify-end gap-1">
                        {allowEmpty && (
                            <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => {
                                    onAdd('');
                                    setSrc('');
                                    setOpen(false);
                                }}
                                type="button"
                            >
                                {emptyLabel ?? 'Skip URL'}
                            </Button>
                        )}

                        <Button type="submit" size="xs" disabled={!src.trim() && !allowEmpty}>
                            Add
                        </Button>
                    </div>
                </form>

            </PopoverContent>
        </Popover>
    );
}
