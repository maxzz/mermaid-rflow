import { useAtomValue, useSetAtom } from 'jotai';
import { rf_SearchDialogOpenAtom, rf_SelectedEdgesAtom, rf_SelectedNodesAtom } from '../8-store/a-rflow-ui-atoms';
import { doDeleteSelectedAtom, doDuplicateNodesAtom, doLockNodesAtom, doSelectSubgraphContentsAtom, doUnlockNodesAtom } from '../8-store/2-rflow-toolbars-atoms';
import { EditingToolbar } from './8-1-1-0-toolbar-rflow';
import { PaletteToolbar } from './8-1-3-palette-toolbar';

export function RflowToolbars() {
    const selectedNodes = useAtomValue(rf_SelectedNodesAtom);
    const selectedEdges = useAtomValue(rf_SelectedEdgesAtom);
    const setSearchOpen = useSetAtom(rf_SearchDialogOpenAtom);
    const onDuplicateNodes = useSetAtom(doDuplicateNodesAtom);
    const onDeleteSelected = useSetAtom(doDeleteSelectedAtom);
    const onLockNodes = useSetAtom(doLockNodesAtom);
    const onUnlockNodes = useSetAtom(doUnlockNodesAtom);
    const onSelectSubgraphContents = useSetAtom(doSelectSubgraphContentsAtom);

    return (
        <div className="px-2 py-1.5 border-b border-border bg-muted/20 shrink-0 flex flex-col gap-1.5">
            <EditingToolbar
                selectedNodes={selectedNodes}
                selectedEdges={selectedEdges}
                onDuplicateNodes={onDuplicateNodes}
                onDeleteSelected={onDeleteSelected}
                onLockNodes={onLockNodes}
                onUnlockNodes={onUnlockNodes}
                onSelectSubgraphContents={onSelectSubgraphContents}
                onOpenSearch={() => setSearchOpen(true)}
            />
            <PaletteToolbar />
        </div>
    );
}
