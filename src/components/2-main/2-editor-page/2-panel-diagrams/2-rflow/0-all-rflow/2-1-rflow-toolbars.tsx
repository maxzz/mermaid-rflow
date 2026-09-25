import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { type Edge, type Node } from 'reactflow';
import { rf_Diagram, setRflowEdges, setRflowNodes } from '../8-store/0-flow-diagram';
import { rf_SearchDialogOpenAtom, rf_SelectedEdgesAtom, rf_SelectedNodesAtom } from '../8-store/a-rflow-ui-atoms';
import { syncMermaidFromGraph } from '../8-store/1-sync-with-source';
import { deleteSelected, duplicateNodes, lockNodes, unlockNodes } from '../1-canvas/8-diagram-editing-utils';
import { EditingToolbar } from './8-1-1-0-toolbar-rflow';
import { PaletteToolbar } from './8-1-3-palette-toolbar';

export function RflowToolbars() {
    const [selectedNodes, setSelectedNodes] = useAtom(rf_SelectedNodesAtom);
    const [selectedEdges, setSelectedEdges] = useAtom(rf_SelectedEdgesAtom);
    const setSearchOpen = useSetAtom(rf_SearchDialogOpenAtom);

    const commitNodes = useCallback(
        (next: Node[]) => {
            setRflowNodes(next);
            setSelectedNodes(next.filter((n) => n.selected));
        },
        [setSelectedNodes]);

    const onDuplicateNodes = useCallback(
        () => {
            commitNodes(duplicateNodes(rf_Diagram.nodes as Node[], selectedNodes));
            syncMermaidFromGraph();
        },
        [commitNodes, selectedNodes]);

    const onDeleteSelected = useCallback(
        () => {
            const { newNodes, newEdges } = deleteSelected(rf_Diagram.nodes as Node[], rf_Diagram.edges as Edge[], selectedNodes, selectedEdges);
            setRflowNodes(newNodes);
            setRflowEdges(newEdges);
            setSelectedNodes([]);
            setSelectedEdges([]);
            syncMermaidFromGraph();
        },
        [selectedEdges, selectedNodes, setSelectedEdges, setSelectedNodes]);

    const onLockNodes = useCallback(
        () => {
            const next = lockNodes(rf_Diagram.nodes as Node[], selectedNodes);
            setRflowNodes(next);
            setSelectedNodes(
                selectedNodes
                    .map((n) => next.find((x) => x.id === n.id))
                    .filter((n): n is Node => n !== undefined),
            );
        },
        [selectedNodes, setSelectedNodes]);

    const onUnlockNodes = useCallback(
        () => {
            const next = unlockNodes(rf_Diagram.nodes as Node[], selectedNodes);
            setRflowNodes(next);
            setSelectedNodes(
                selectedNodes
                    .map((n) => next.find((x) => x.id === n.id))
                    .filter((n): n is Node => n !== undefined),
            );
        },
        [selectedNodes, setSelectedNodes]);

    const onSelectSubgraphContents = useCallback(
        (subgraphNodeId?: string) => {
            selectSubgraphContents(subgraphNodeId, setSelectedNodes, setSelectedEdges);
        },
        [setSelectedEdges, setSelectedNodes]);

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

export function selectSubgraphContents(subgraphNodeId: string | undefined, setSelectedNodes: (nodes: Node[]) => void, setSelectedEdges: (edges: Edge[]) => void) {
    if (!subgraphNodeId) {
        return;
    }
    const updatedNodes = (rf_Diagram.nodes as Node[]).map((n) => ({ ...n, selected: n.parentNode === subgraphNodeId }));
    const nodeIds = new Set(updatedNodes.filter((n) => n.parentNode === subgraphNodeId).map((n) => n.id));
    const updatedEdges = (rf_Diagram.edges as Edge[]).map((e) => ({ ...e, selected: nodeIds.has(e.source) && nodeIds.has(e.target) }));
    setRflowNodes(updatedNodes);
    setRflowEdges(updatedEdges);
    setSelectedNodes(updatedNodes.filter((n) => n.selected));
    setSelectedEdges(updatedEdges.filter((e) => e.selected));
}
