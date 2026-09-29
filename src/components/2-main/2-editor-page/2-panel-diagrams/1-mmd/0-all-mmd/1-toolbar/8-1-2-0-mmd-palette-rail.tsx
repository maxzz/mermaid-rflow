import { type FormEvent, useState } from 'react';
import { useSnapshot } from 'valtio';
import { ImageIcon, VideoIcon } from 'lucide-react';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { sourceLink } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { Label } from '@/ui/shadcn/label';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/ui/shadcn/popover';
import { classifyMermaidSource } from '../../3-catalog/1-flowchart-source';
import { insertMmdPaletteNode, selectedMmdNodeId } from '../../3-catalog/4-apply-patch';
import { MmdStylePopover } from './8-1-2-1-mmd-style-panel';
import { ShapePopover } from './8-1-2-2-mmd-shape-popover';
import { IconPopover } from './8-1-2-3-mmd-icon-popover';

export function MmdPaletteRail() {
    const { source } = useSnapshot(mermaidSettings);
    useSnapshot(sourceLink);
    const kind = classifyMermaidSource(source);
    const enabled = kind === 'flowchart' || kind === 'empty';
    const selected = selectedMmdNodeId();
    const applyTitle = selected ? `Change selected block (${selected})` : 'Add a shape';

    return (
        <div className="flex items-center gap-0.5" role="toolbar" aria-label="Shapes">
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

            <PopoverContent side="bottom" align="start" className="p-3 w-64">
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
