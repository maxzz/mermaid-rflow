import { atom, useAtomValue, useSetAtom } from 'jotai';
import { type Edge, type Node } from 'reactflow';
import { rf_Diagram, setRflowEdges, setRflowNodes } from '../8-store/0-flow-diagram';
import { rf_CommitNodesAtom, rf_SearchDialogOpenAtom, rf_SelectedEdgesAtom, rf_SelectedNodesAtom } from '../8-store/a-rflow-ui-atoms';
import { syncMermaidFromGraph } from '../8-store/1-sync-with-source';
import { deleteSelected, duplicateNodes, lockNodes, unlockNodes } from '../1-canvas/8-diagram-editing-utils';
import { EditingToolbar } from './8-1-1-0-toolbar-rflow';
import { PaletteToolbar } from './8-1-3-palette-toolbar';

export const doDuplicateNodesAtom = atom(null, (get, set) => {
    const next = duplicateNodes(rf_Diagram.nodes as Node[], get(rf_SelectedNodesAtom));
    set(rf_CommitNodesAtom, next);
    syncMermaidFromGraph();
});

export const doDeleteSelectedAtom = atom(null, (get, set) => {
    const { newNodes, newEdges } = deleteSelected(
        rf_Diagram.nodes as Node[],
        rf_Diagram.edges as Edge[],
        get(rf_SelectedNodesAtom),
        get(rf_SelectedEdgesAtom),
    );
    setRflowNodes(newNodes);
    setRflowEdges(newEdges);
    set(rf_SelectedNodesAtom, []);
    set(rf_SelectedEdgesAtom, []);
    syncMermaidFromGraph();
});

export const doLockNodesAtom = atom(null, (get, set) => {
    const selected = get(rf_SelectedNodesAtom);
    const next = lockNodes(rf_Diagram.nodes as Node[], selected);
    setRflowNodes(next);
    set(rf_SelectedNodesAtom, refreshedSelection(next, selected));
});

export const doUnlockNodesAtom = atom(null, (get, set) => {
    const selected = get(rf_SelectedNodesAtom);
    const next = unlockNodes(rf_Diagram.nodes as Node[], selected);
    setRflowNodes(next);
    set(rf_SelectedNodesAtom, refreshedSelection(next, selected));
});

export const doSelectSubgraphContentsAtom = atom(null, (_get, set, subgraphNodeId?: string) => {
    if (!subgraphNodeId) {
        return;
    }
    const updatedNodes = (rf_Diagram.nodes as Node[]).map((n) => ({ ...n, selected: n.parentNode === subgraphNodeId }));
    const nodeIds = new Set(updatedNodes.filter((n) => n.parentNode === subgraphNodeId).map((n) => n.id));
    const updatedEdges = (rf_Diagram.edges as Edge[]).map((e) => ({ ...e, selected: nodeIds.has(e.source) && nodeIds.has(e.target) }));
    setRflowNodes(updatedNodes);
    setRflowEdges(updatedEdges);
    set(rf_SelectedNodesAtom, updatedNodes.filter((n) => n.selected));
    set(rf_SelectedEdgesAtom, updatedEdges.filter((e) => e.selected));
});

function refreshedSelection(next: Node[], selected: Node[]): Node[] {
    return selected
        .map((n) => next.find((x) => x.id === n.id))
        .filter((n): n is Node => n !== undefined);
}

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
