import { type DragEvent, type MouseEvent, type ReactNode, type RefObject, useCallback, useMemo } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useSnapshot } from 'valtio';
import { classNames } from '@/utils';
import { appSettings } from '@/store/1-ui-settings';

import ReactFlow, {
    type Connection,
    type DefaultEdgeOptions,
    type Edge,
    type EdgeChange,
    type Node,
    type NodeChange,
    type NodeTypes,
    addEdge,
    applyEdgeChanges,
    applyNodeChanges,
    Background,
    BackgroundVariant,
    ConnectionLineType,
    ConnectionMode,
    MarkerType,
    MiniMap,
    useReactFlow,
    useStoreApi,
} from 'reactflow';

import { rf_Diagram, setRflowEdges, setRflowNodes } from '../8-store/a-0-flow-diagram';
import { draftFromNode, rf_DraggingAtom, rf_EdgeLabelEditorAtom, rf_NodeEditorDraftAtom, rf_PanModeAtom, rf_SelectedEdgesAtom, rf_SelectedNodesAtom } from '../8-store/a-1-rflow-ui-atoms';
import { syncMermaidFromGraph } from '../8-store/a-7-sync-with-source';
import { CustomNode, DiamondNode, SubgraphNode } from '../1-canvas/nodes';
import { createPaletteNode } from '../1-canvas/nodes/4-node-common';
import { SelectionFrame } from '../5-multi-select';
import { ZOOM_MAX, ZOOM_MIN } from '@/store/2-mermaid-settings';
import { useFlowSourceLink } from './2-3-use-rflow-source-link';

export function RflowCanvas({ sourceLink, anchorRef }: { sourceLink: ReturnType<typeof useFlowSourceLink>; anchorRef: RefObject<HTMLDivElement | null>; }) {
    const { nodes, edges } = useSnapshot(rf_Diagram);
    const { rflow } = useSnapshot(appSettings);
    const reactFlowInstance = useReactFlow();
    const [panMode] = useAtom(rf_PanModeAtom);

    const setIsDragging = useSetAtom(rf_DraggingAtom);
    const setSelectedNodes = useSetAtom(rf_SelectedNodesAtom);
    const setSelectedEdges = useSetAtom(rf_SelectedEdgesAtom);
    const setEdgeLabelEditor = useSetAtom(rf_EdgeLabelEditorAtom);
    const setNodeEditorDraft = useSetAtom(rf_NodeEditorDraftAtom);

    const nodesWithLink = useMemo(
        () => (nodes as Node[]).map(
            (n) => ({ ...n, className: classNames(n.className, sourceLink.classForNode(n)) })
        ),
        [nodes, sourceLink.classForNode, sourceLink.keys, sourceLink.intensity]);

    const edgesWithSelection = useMemo(
        () => (edges as Edge[]).map(
            (edge) => ({ ...edge, className: classNames(edge.className, sourceLink.classForEdge(edge)) })
        ),
        [edges, sourceLink.classForEdge, sourceLink.keys, sourceLink.intensity]);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            const updated = applyNodeChanges(changes, rf_Diagram.nodes as Node[]);
            setRflowNodes(updated);
            if (changes.some((c) => c.type === 'select')) {
                setSelectedNodes(updated.filter((n) => n.selected));
            }

            if (changes.some((c) => c.type === 'remove' || c.type === 'add')) {
                if (changes.some((c) => c.type === 'remove')) {
                    const ids = new Set(updated.map((n) => n.id));
                    const nextEdges = (rf_Diagram.edges as Edge[]).filter((e) => ids.has(e.source) && ids.has(e.target));
                    if (nextEdges.length !== rf_Diagram.edges.length) {
                        setRflowEdges(nextEdges);
                    }
                }
                syncMermaidFromGraph();
            }
        },
        [setSelectedNodes]);

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            const updated = applyEdgeChanges(changes, rf_Diagram.edges as Edge[]);
            setRflowEdges(updated);

            if (changes.some((c) => c.type === 'select')) {
                setSelectedEdges(updated.filter((e) => e.selected));
            }

            if (changes.some((c) => c.type === 'remove' || c.type === 'add')) {
                syncMermaidFromGraph();
            }
        },
        [setSelectedEdges]);

    const onConnect = useCallback(
        (connection: Connection) => {
            setRflowEdges(
                addEdge({ ...defaultEdgeOptions, ...connection, data: { ...defaultEdgeOptions.data, mermaidType: '-->' } }, rf_Diagram.edges as Edge[]),
            );
            syncMermaidFromGraph();
        },
        []);

    const onEdgeDoubleClick = useCallback(
        (event: MouseEvent, edge: Edge) => {
            const rect = anchorRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
            setEdgeLabelEditor({
                edgeId: edge.id,
                text: String(edge.label ?? ''),
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            });
        },
        [anchorRef, setEdgeLabelEditor]);

    const onNodeDoubleClick = useCallback(
        (_event: MouseEvent, node: Node) => {
            setNodeEditorDraft(draftFromNode(node));
        },
        [setNodeEditorDraft]);

    const onEdgeUpdate = useCallback(
        (oldEdge: Edge, newConnection: Connection) => {
            if (!newConnection.source || !newConnection.target) {
                return;
            }
            setRflowEdges(
                (rf_Diagram.edges as Edge[]).map(
                    (edge) => (
                        edge.id === oldEdge.id
                            ? {
                                ...edge,
                                ...newConnection,
                                source: newConnection.source!,
                                target: newConnection.target!,
                                data: { ...edge.data, mermaidType: edge.data?.mermaidType ?? '-->' },
                            }
                            : edge
                    )
                ),
            );
            syncMermaidFromGraph();
        },
        []);

    function onDragOver(event: DragEvent) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    function onDrop(event: DragEvent) {
        event.preventDefault();
        const type = event.dataTransfer.getData('application/reactflow');
        if (!type) {
            return;
        }
        const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const current = rf_Diagram.nodes as Node[];
        const newNode = createPaletteNode(type, position, current);
        if (newNode) {
            setRflowNodes([...current, newNode]);
            syncMermaidFromGraph();
        }
    }

    return (
        <ReactFlow
            minZoom={ZOOM_MIN}
            maxZoom={ZOOM_MAX}

            nodes={nodesWithLink}
            edges={edgesWithSelection}
            nodesDraggable={!panMode}
            nodesConnectable={!panMode}
            elementsSelectable={!panMode}
            panOnDrag={panMode}
            selectionKeyCode={null}
            multiSelectionKeyCode="Shift"
            deleteKeyCode={['Delete', 'Backspace']}
            onlyRenderVisibleElements
            
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            panOnScroll={false}
            zoomOnScroll
            zoomOnPinch
            edgesUpdatable
            connectionLineType={ConnectionLineType.SmoothStep}
            connectionMode={ConnectionMode.Loose}

            onConnect={onConnect}
            onError={onReactFlowError}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onEdgeUpdate={onEdgeUpdate}
            onNodeDragStart={() => setIsDragging(true)}
            onNodeDragStop={() => setIsDragging(false)}
            onNodeClick={sourceLink.onNodeClick}
            onEdgeClick={sourceLink.onEdgeClick}
            onPaneClick={sourceLink.onPaneClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            {rflow.showBgGrid && <Background variant={BackgroundVariant.Dots} />}
            {rflow.showMinimap && <MiniMap />}
            <SelectionFrame />
        </ReactFlow>
    );
}

const nodeTypes: NodeTypes = {
    custom: CustomNode,
    diamond: DiamondNode,
    group: SubgraphNode,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#1976D2', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#1976D2' },
    data: { mermaidType: '-->' },
};

/** reactflow@11 checks type keys inside useMemo; React Strict Mode runs that callback twice and false-positives error 002. */
function onReactFlowError(id: string, message: string) {
    if (id === '002' || id === '004') {
        return;
    }
    console.warn(`[React Flow]: ${message} Help: https://reactflow.dev/error#${id}`);
}

export function ReactFlowErrorGuard({ children }: { children: ReactNode; }) {
    const store = useStoreApi();
    if (store.getState().onError !== onReactFlowError) {
        store.getState().onError = onReactFlowError;
    }
    return children;
}
