/**
 * Adapted from mermaid-reactflow-editor (MIT).
 */
import { type DragEvent } from 'react';
import { DiamondIcon, LayersIcon, SquareIcon } from 'lucide-react';
import { classNames } from '@/utils';

type PaletteItem = {
    id: string;
    type: 'node' | 'subgraph' | 'diamond';
    label: string;
    Icon: typeof SquareIcon;
};

const ITEMS: PaletteItem[] = [
    { id: 'node', type: 'node', label: 'Node', Icon: SquareIcon },
    { id: 'diamond', type: 'diamond', label: 'Conditional', Icon: DiamondIcon },
    { id: 'subgraph', type: 'subgraph', label: 'Subgraph', Icon: LayersIcon },
];

export function PaletteToolbar({ className }: { className?: string; }) {
    function onDragStart(e: DragEvent, item: PaletteItem) {
        e.dataTransfer.setData('application/reactflow', item.type);
        e.dataTransfer.effectAllowed = 'move';
    }

    return (
        <div className={classNames('flex items-center gap-1.5 overflow-x-auto', className)} role="toolbar" aria-label="Palette">
            {ITEMS.map((it) => {
                const Icon = it.Icon;
                return (
                    <div
                        key={it.id}
                        className="px-2 py-1 text-[.7rem] bg-background border border-border rounded-md cursor-grab select-none flex items-center gap-1.5 hover:bg-muted"
                        draggable
                        onDragStart={(e) => onDragStart(e, it)}
                        title={`Drag ${it.label} onto canvas`}
                        role="button"
                    >
                        <Icon className="size-3.5" />
                        <span className="whitespace-nowrap">{it.label}</span>
                    </div>
                );
            })}
        </div>
    );
}
