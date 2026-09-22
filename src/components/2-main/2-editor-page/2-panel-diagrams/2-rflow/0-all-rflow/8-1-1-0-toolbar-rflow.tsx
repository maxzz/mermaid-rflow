import { BoxSelectIcon, CopyIcon, LockIcon, SearchIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import { type Edge, type Node } from 'reactflow';
import { AlignHorizontalGroup, AlignVerticalGroup, DistributeGroup } from './8-1-1-1-arrange-groups';

type EditingToolbarProps = {
    selectedNodes: Node[];
    selectedEdges: Edge[];
    onDuplicateNodes: () => void;
    onDeleteSelected: () => void;
    onLockNodes: () => void;
    onUnlockNodes: () => void;
    onSelectSubgraphContents?: (subgraphNodeId?: string) => void;
    onOpenSearch?: () => void;
};

export function EditingToolbar({
    selectedNodes,
    selectedEdges,
    onDuplicateNodes,
    onDeleteSelected,
    onLockNodes,
    onUnlockNodes,
    onSelectSubgraphContents,
    onOpenSearch,
}: EditingToolbarProps) {
    const hasSelectedNodes = selectedNodes.length > 0;
    const hasSelectedElements = selectedNodes.length > 0 || selectedEdges.length > 0;
    const locked = selectedNodes.some((node) => node.data?.locked);
    const subgraphSelected = selectedNodes.length === 1 && (selectedNodes[0].type === 'group' || selectedNodes[0]?.data?.isSubgraph);

    return (
        <div className="flex items-center gap-0.5 flex-wrap" role="toolbar" aria-label="Editing tools">
            {subgraphSelected && (
                <Button variant="ghost" size="icon-xs" title="Select contents" onClick={() => onSelectSubgraphContents?.(selectedNodes[0].id)}>
                    <BoxSelectIcon />
                </Button>
            )}

            <span className="px-1.5 min-w-5 h-5 text-[.65rem] tabular-nums text-muted-foreground bg-muted rounded-sm inline-flex items-center justify-center">
                {selectedNodes.length}
            </span>

            <div className="mx-1 w-0 h-full border-l border-border" />

            <Button variant="ghost" size="icon-xs" title="Search (Ctrl+F)" onClick={onOpenSearch}>
                <SearchIcon />
            </Button>

            <div className="mx-1 w-0 h-full border-l border-border" />

            <AlignHorizontalGroup />

            <div className="mx-1 w-0 h-full border-l border-border" />

            <AlignVerticalGroup />

            <div className="mx-1 w-0 h-full border-l border-border" />

            <DistributeGroup />

            <div className="mx-1 w-0 h-full border-l border-border" />

            <Button variant="ghost" size="icon-xs" title="Duplicate" onClick={onDuplicateNodes} disabled={!hasSelectedNodes}>
                <CopyIcon />
            </Button>

            <Button
                variant={locked ? 'default' : 'ghost'}
                size="icon-xs"
                title={locked ? 'Unlock selected nodes' : 'Lock selected nodes'}
                onClick={() => locked ? onUnlockNodes() : onLockNodes()}
                disabled={!hasSelectedNodes}
            >
                <LockIcon />
            </Button>

            <Button variant="ghost" size="icon-xs" className="text-destructive" title="Delete" onClick={onDeleteSelected} disabled={!hasSelectedElements}>
                <Trash2Icon />
            </Button>
        </div>
    );
}
