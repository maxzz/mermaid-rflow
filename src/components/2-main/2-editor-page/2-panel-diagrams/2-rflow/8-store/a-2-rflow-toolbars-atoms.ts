import { atom } from 'jotai';
import { type Edge, type Node } from 'reactflow';
import { rf_Diagram, setRflowEdges, setRflowNodes } from './a-0-flow-diagram';
import { rf_SelectedEdgesAtom, rf_SelectedNodesAtom } from './a-1-rflow-ui-atoms';
import { rf_CommitNodesAtom } from './a-3-rflow-arrange-atoms';
import { syncMermaidFromGraph } from './a-7-sync-with-source';
import { nextRfId, prefixForNode } from '../2-converter/8-mermaid-ids';

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

//---------------------------------------------------------------------------
// duplicate nodes

export const doDuplicateNodesAtom = atom(null, (get, set) => {
    const next = duplicateNodes(rf_Diagram.nodes as Node[], get(rf_SelectedNodesAtom));
    set(rf_CommitNodesAtom, next);
    syncMermaidFromGraph();
});

function duplicateNodes(nodes: Node[], selectedNodes: Node[]): Node[] {
    const newNodes = [...nodes];
    selectedNodes.forEach(
        (node) => {
            newNodes.push({
                ...node,
                id: nextRfId(newNodes, prefixForNode(node)),
                position: { x: node.position.x + 50, y: node.position.y + 50 },
                selected: false,
            });
        }
    );
    return newNodes;
}

//---------------------------------------------------------------------------
// delete selected

export const doDeleteSelectedAtom = atom(null, (get, set) => {
    const { newNodes, newEdges } = deleteSelected(
        rf_Diagram.nodes,
        rf_Diagram.edges,
        get(rf_SelectedNodesAtom),
        get(rf_SelectedEdgesAtom),
    );
    setRflowNodes(newNodes);
    setRflowEdges(newEdges);
    
    set(rf_SelectedNodesAtom, []);
    set(rf_SelectedEdgesAtom, []);
    syncMermaidFromGraph();
});

function deleteSelected(nodes: Node[], edges: Edge[], selectedNodes: Node[], selectedEdges: Edge[]) {
    const nodeIdsToDelete = selectedNodes.map((n) => n.id);
    const edgeIdsToDelete = selectedEdges.map((e) => e.id);
    const newNodes = nodes.filter((n) => !nodeIdsToDelete.includes(n.id));
    const newEdges = edges.filter((
        (e) =>
            !edgeIdsToDelete.includes(e.id) &&
            !nodeIdsToDelete.includes(e.source) &&
            !nodeIdsToDelete.includes(e.target)
    ));
    return { newNodes, newEdges };
}

//---------------------------------------------------------------------------
// toggle lock nodes

export const doToggleLockNodesAtom = atom(null, (get, set) => {
    const selected = get(rf_SelectedNodesAtom);
    const next = get(rf_SelectedLockedAtom)
        ? unlockNodes(rf_Diagram.nodes as Node[], selected)
        : lockNodes(rf_Diagram.nodes as Node[], selected);

    setRflowNodes(next);
    set(rf_SelectedNodesAtom, refreshedSelection(next, selected));
});

function lockNodes(nodes: Node[], selectedNodes: Node[]): Node[] {
    return nodes.map(
        (node) => (
            selectedNodes.some((sn) => sn.id === node.id) ? { ...node, draggable: false, data: { ...node.data, locked: true } } : node
        )
    );
}

function unlockNodes(nodes: Node[], selectedNodes: Node[]): Node[] {
    return nodes.map(
        (node) => (
            selectedNodes.some((sn) => sn.id === node.id) ? { ...node, draggable: true, data: { ...node.data, locked: false } } : node
        )
    );
}

function refreshedSelection(next: Node[], selected: Node[]): Node[] {
    return (
        selected
            .map((n) => next.find((x) => x.id === n.id))
            .filter((n): n is Node => n !== undefined)
    );
}

//---------------------------------------------------------------------------
// derived atoms

export const rf_SelectedLockedAtom = atom((get) => get(rf_SelectedNodesAtom).some((node) => node.data?.locked));

export const rf_SelectedNodesLengthAtom = atom((get) => get(rf_SelectedNodesAtom).length);

export const rf_SelectedElementsLengthAtom = atom((get) => get(rf_SelectedNodesLengthAtom) + get(rf_SelectedEdgesAtom).length);

export const rf_SubgraphSelectedAtom = atom((get) => {
    const selectedNodes = get(rf_SelectedNodesAtom);
    return selectedNodes.length === 1 && (selectedNodes[0].type === 'group' || Boolean(selectedNodes[0]?.data?.isSubgraph));
});
