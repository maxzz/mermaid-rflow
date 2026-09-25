import { useAtomValue, useSetAtom } from 'jotai';
import { BoxSelectIcon, CopyIcon, LockIcon, SearchIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import { rf_SearchDialogOpenAtom, rf_SelectedNodesAtom } from '../8-store/a-rflow-ui-atoms';
import { doDeleteSelectedAtom, doDuplicateNodesAtom, doLockNodesAtom, doSelectSubgraphContentsAtom, doUnlockNodesAtom, rf_HasSelectedNodesAtom, rf_SelectedElementsLengthAtom, rf_SelectedLockedAtom, rf_SubgraphSelectedAtom } from '../8-store/2-rflow-toolbars-atoms';
import { AlignHorizontalGroup, AlignVerticalGroup, DistributeGroup } from './8-1-1-1-arrange-buttons';

export function EditingToolbar() {
    const selectedNodes = useAtomValue(rf_SelectedNodesAtom);
    const setSearchOpen = useSetAtom(rf_SearchDialogOpenAtom);
    const onDuplicateNodes = useSetAtom(doDuplicateNodesAtom);
    const onDeleteSelected = useSetAtom(doDeleteSelectedAtom);
    const onLockNodes = useSetAtom(doLockNodesAtom);
    const onUnlockNodes = useSetAtom(doUnlockNodesAtom);
    const onSelectSubgraphContents = useSetAtom(doSelectSubgraphContentsAtom);

    const locked = useAtomValue(rf_SelectedLockedAtom);
    const hasSelectedNodes = useAtomValue(rf_HasSelectedNodesAtom);
    const selectedElementsLength = useAtomValue(rf_SelectedElementsLengthAtom);
    const subgraphSelected = useAtomValue(rf_SubgraphSelectedAtom);

    return (
        <div className="flex items-center gap-0.5 flex-wrap" role="toolbar" aria-label="Editing tools">
            {subgraphSelected && (
                <Button variant="ghost" size="icon-xs" title="Select contents" onClick={() => onSelectSubgraphContents(selectedNodes[0].id)}>
                    <BoxSelectIcon />
                </Button>
            )}

            <span className="px-1.5 min-w-5 h-5 text-[.65rem] tabular-nums text-muted-foreground bg-muted rounded-sm inline-flex items-center justify-center">
                {selectedNodes.length}
            </span>

            <div className="mx-1 w-0 h-full border-l border-border" />

            <Button variant="ghost" size="icon-xs" title="Search (Ctrl+F)" onClick={() => setSearchOpen(true)}>
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

            <Button variant="ghost" size="icon-xs" className="text-destructive" title="Delete" onClick={onDeleteSelected} disabled={!selectedElementsLength}>
                <Trash2Icon />
            </Button>
        </div>
    );
}
