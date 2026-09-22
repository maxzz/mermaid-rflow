/**
 * Adapted from mermaid-reactflow-editor (MIT).
 */
import { type Edge, type Node } from 'reactflow';
import { BoxSelectIcon, CopyIcon, LockIcon, SearchIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import {
    IconAlignBottom,
    IconAlignCenterHorizontally,
    IconAlignCenterVertically,
    IconAlignLeft,
    IconAlignRight,
    IconAlignTop,
    IconDistributeHorizontally,
    IconDistributeVertically,
} from '@/ui/icons/normal/align';
import { type AlignmentType, type DistributionType } from '../2-converter/constants';

type EditingToolbarProps = {
    selectedNodes: Node[];
    selectedEdges: Edge[];
    onAlignNodes: (alignment: AlignmentType) => void;
    onDistributeNodes: (direction: DistributionType) => void;
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
    onAlignNodes,
    onDistributeNodes,
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
                <Button
                    variant="ghost"
                    size="icon-xs"
                    title="Select contents"
                    onClick={() => onSelectSubgraphContents?.(selectedNodes[0].id)}
                >
                    <BoxSelectIcon />
                </Button>
            )}

            <span className="px-1.5 min-w-5 h-5 text-[.65rem] tabular-nums text-muted-foreground bg-muted rounded-sm inline-flex items-center justify-center">
                {selectedNodes.length}
            </span>

            <div className="mx-1 w-px h-4 bg-border" />

            <Button variant="ghost" size="icon-xs" title="Search (Ctrl+F)" onClick={onOpenSearch}>
                <SearchIcon />
            </Button>

            <div className="mx-1 w-px h-4 bg-border" />

            <Button variant="ghost" size="icon-xs" title="Align left" onClick={() => onAlignNodes('left')}>
                <IconAlignLeft className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-xs" title="Align center" onClick={() => onAlignNodes('center-horizontal')}>
                <IconAlignCenterHorizontally className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-xs" title="Align right" onClick={() => onAlignNodes('right')}>
                <IconAlignRight className="size-3.5" />
            </Button>

            <div className="mx-1 w-px h-4 bg-border" />

            <Button variant="ghost" size="icon-xs" title="Align top" onClick={() => onAlignNodes('top')}>
                <IconAlignTop className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-xs" title="Align middle" onClick={() => onAlignNodes('center-vertical')}>
                <IconAlignCenterVertically className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-xs" title="Align bottom" onClick={() => onAlignNodes('bottom')}>
                <IconAlignBottom className="size-3.5" />
            </Button>

            <div className="mx-1 w-px h-4 bg-border" />

            <Button variant="ghost" size="icon-xs" title="Distribute horizontally" onClick={() => onDistributeNodes('horizontal')}>
                <IconDistributeHorizontally className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-xs" title="Distribute vertically" onClick={() => onDistributeNodes('vertical')}>
                <IconDistributeVertically className="size-3.5" />
            </Button>

            <div className="mx-1 w-px h-4 bg-border" />

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
