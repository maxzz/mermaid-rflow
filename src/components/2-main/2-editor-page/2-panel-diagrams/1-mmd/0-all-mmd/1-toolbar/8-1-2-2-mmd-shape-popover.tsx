import { useState } from 'react';
import { useSetAtom } from 'jotai';
import { ShapesIcon } from 'lucide-react';
import { classNames } from '@/utils';
import { Button } from '@/ui/shadcn/button';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/ui/shadcn/popover';
import { FLOW_SHAPE_ITEMS, type NodeShape } from '../../3-catalog/1-flowchart-source';
import { insertMmdPaletteNode } from '../../3-catalog/4-apply-patch';
import { mmdPaletteShapeAtom } from '../../8-store/3-mmd-ui-atoms';

export function ShapePopover({ enabled, selected, applyTitle }: { enabled: boolean; selected: string | null; applyTitle: string; }) {
    const setShape = useSetAtom(mmdPaletteShapeAtom);
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-sm" disabled={!enabled} title={applyTitle} aria-label={applyTitle}>
                    <ShapesIcon />
                </Button>
            </PopoverTrigger>

            <PopoverContent side="bottom" align="start" className="p-2 w-56">
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
