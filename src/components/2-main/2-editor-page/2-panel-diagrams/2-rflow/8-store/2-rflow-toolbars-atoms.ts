import { atom } from 'jotai';
import { type Edge, type Node } from 'reactflow';
import { deleteSelected, duplicateNodes, lockNodes, unlockNodes } from '../1-canvas/8-diagram-editing-utils';
import { rf_Diagram, setRflowEdges, setRflowNodes } from './0-flow-diagram';
import { syncMermaidFromGraph } from './1-sync-with-source';
import { rf_CommitNodesAtom, rf_SelectedEdgesAtom, rf_SelectedNodesAtom } from './a-rflow-ui-atoms';

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

//---------------------------------------------------------------------------

export const rf_SelectedLockedAtom = atom((get) => get(rf_SelectedNodesAtom).some((node) => node.data?.locked));

export const rf_SelectedNodesLengthAtom = atom((get) => get(rf_SelectedNodesAtom).length);

export const rf_SelectedElementsLengthAtom = atom((get) => get(rf_SelectedNodesLengthAtom) + get(rf_SelectedEdgesAtom).length);

export const rf_SubgraphSelectedAtom = atom((get) => {
    const selectedNodes = get(rf_SelectedNodesAtom);
    return selectedNodes.length === 1 && (selectedNodes[0].type === 'group' || Boolean(selectedNodes[0]?.data?.isSubgraph));
});
