/**
 * Adapted from mermaid-reactflow-editor (MIT).
 * React Flow canvas bound to Valtio graph state and Jotai chrome.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useSnapshot } from 'valtio';
import { toast } from 'sonner';
import ReactFlow, {
    addEdge,
    applyEdgeChanges,
    applyNodeChanges,
    Background,
    BackgroundVariant,
    ConnectionLineType,
    ConnectionMode,
    Controls,
    MarkerType,
    MiniMap,
    ReactFlowProvider,
    useReactFlow,
    type Connection,
    type Edge,
    type EdgeChange,
    type Node,
    type NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '@/features/rflow/styles/selected-edge.css';
import '@/features/rflow/styles/rflow-nodes.css';

import { rflowDiagram, setFlowEdges, setFlowNodes } from '../store/1-flow-diagram';
import {
    draftFromNode,
    rflowCanvasMethodsAtom,
    rflowDraggingAtom,
    rflowEdgeLabelEditorAtom,
    rflowExportingAtom,
    rflowNodeEditorDraftAtom,
    rflowSearchOpenAtom,
    rflowSelectedEdgeIdAtom,
    rflowSelectedEdgesAtom,
    rflowSelectedNodesAtom,
} from '../store/2-flow-ui';
import { exportReactFlowImage } from './exportImage';
import {
    alignNodes,
    deleteSelected,
    distributeNodes,
    duplicateNodes,
    lockNodes,
    unlockNodes,
} from './diagramEditingUtils';
import { CustomNode, DiamondNode, SubgraphNode } from './nodes';
import { EditingToolbar } from '../ui/EditingToolbar';
import { PaletteToolbar } from '../ui/PaletteToolbar';
import { EdgeLabelEditor } from '../ui/EdgeLabelEditor';
import { NodeEditor } from '../ui/NodeEditor';
import { NodeSearchDialog } from '../ui/NodeSearchDialog';
import { type AlignmentType, type DistributionType } from '../converter/constants';
import { appSettings } from '@/store/1-ui-settings';
import { isThemeDark } from '@/utils/theme-utils';
import { classNames } from '@/utils';
import { BarsLoaderIcon } from '@/ui/local-ui';

const nodeTypes = {
    custom: CustomNode,
    diamond: DiamondNode,
    group: SubgraphNode,
};

function FlowDiagramInternal() {
    const { nodes, edges } = useSnapshot(rflowDiagram);
    const { theme } = useSnapshot(appSettings);
    const isDark = isThemeDark(theme);
    const reactFlowInstance = useReactFlow();
    const reactFlowWrapper = useRef<HTMLDivElement | null>(null);

    const [selectedNodes, setSelectedNodes] = useAtom(rflowSelectedNodesAtom);
    const [selectedEdges, setSelectedEdges] = useAtom(rflowSelectedEdgesAtom);
    const [selectedEdgeId, setSelectedEdgeId] = useAtom(rflowSelectedEdgeIdAtom);
    const [searchOpen, setSearchOpen] = useAtom(rflowSearchOpenAtom);
    const [edgeLabelEditor, setEdgeLabelEditor] = useAtom(rflowEdgeLabelEditorAtom);
    const setNodeEditorDraft = useSetAtom(rflowNodeEditorDraftAtom);
    const [exporting, setExporting] = useAtom(rflowExportingAtom);
    const [isDragging, setIsDragging] = useAtom(rflowDraggingAtom);
    const setCanvasMethods = useSetAtom(rflowCanvasMethodsAtom);

    const plainNodes = nodes as Node[];
    const plainEdges = edges as Edge[];

    const handleDownloadImage = useCallback(
        async () => {
            if (!reactFlowWrapper.current) {
                return;
            }
            await exportReactFlowImage({
                wrapper: reactFlowWrapper.current,
                nodes: rflowDiagram.nodes as Node[],
                reactFlowInstance,
                setExporting,
                onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
                fileName: 'reactflow-diagram.png',
                pixelRatio: 8,
            });
        },
        [reactFlowInstance, setExporting],
    );

    const onSelectSubgraphContents = useCallback(
        (subgraphNodeId?: string) => {
            if (!subgraphNodeId) {
                return;
            }
            const updatedNodes = (rflowDiagram.nodes as Node[]).map((n) => ({ ...n, selected: n.parentNode === subgraphNodeId }));
            const nodeIds = new Set(updatedNodes.filter((n) => n.parentNode === subgraphNodeId).map((n) => n.id));
            const updatedEdges = (rflowDiagram.edges as Edge[]).map((e) => ({ ...e, selected: nodeIds.has(e.source) && nodeIds.has(e.target) }));
            setFlowNodes(updatedNodes);
            setFlowEdges(updatedEdges);
            setSelectedNodes(updatedNodes.filter((n) => n.selected));
            setSelectedEdges(updatedEdges.filter((e) => e.selected));
        },
        [setSelectedEdges, setSelectedNodes],
    );

    useEffect(
        () => {
            setCanvasMethods({
                openSearch: () => setSearchOpen(true),
                exportImage: handleDownloadImage,
                selectSubgraphContents: onSelectSubgraphContents,
                fitView: () => reactFlowInstance.fitView({ padding: 0.2 }),
            });
            return () => setCanvasMethods({});
        },
        [handleDownloadImage, onSelectSubgraphContents, reactFlowInstance, setCanvasMethods, setSearchOpen],
    );

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            const updated = applyNodeChanges(changes, rflowDiagram.nodes as Node[]);
            setFlowNodes(updated);
            if (changes.some((c) => c.type === 'select')) {
                setSelectedNodes(updated.filter((n) => n.selected));
            }
        },
        [setSelectedNodes],
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            const updated = applyEdgeChanges(changes, rflowDiagram.edges as Edge[]);
            setFlowEdges(updated);
            if (changes.some((c) => c.type === 'select')) {
                setSelectedEdges(updated.filter((e) => e.selected));
            }
        },
        [setSelectedEdges],
    );

    const onConnect = useCallback(
        (connection: Connection) => {
            setFlowEdges(
                addEdge(
                    {
                        ...connection,
                        type: 'smoothstep',
                        animated: true,
                        style: { stroke: '#1976D2', strokeWidth: 2.5 },
                        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#1976D2' },
                    },
                    rflowDiagram.edges as Edge[],
                ),
            );
        },
        [],
    );

    const onEdgeClick = useCallback(
        (_event: React.MouseEvent, edge: Edge) => {
            setSelectedEdgeId(edge.id);
            const updated = (rflowDiagram.edges as Edge[]).map((e) => ({ ...e, selected: e.id === edge.id }));
            setFlowEdges(updated);
            setSelectedEdges(updated.filter((e) => e.selected));
        },
        [setSelectedEdgeId, setSelectedEdges],
    );

    const handleFocusNode = useCallback(
        (nodeId: string) => {
            reactFlowInstance.fitView({ nodes: [{ id: nodeId }], duration: 600, padding: 0.3 });
            const highlighted = (rflowDiagram.nodes as Node[]).map((n) =>
                n.id === nodeId ? { ...n, style: { ...n.style, outline: '3px solid #ff6b6b' } } : n
            );
            setFlowNodes(highlighted);
            window.setTimeout(
                () => {
                    setFlowNodes(
                        (rflowDiagram.nodes as Node[]).map((n) =>
                            n.id === nodeId ? { ...n, style: { ...n.style, outline: undefined } } : n
                        ),
                    );
                },
                1200,
            );
        },
        [reactFlowInstance],
    );

    const onEdgeDoubleClick = useCallback(
        (event: React.MouseEvent, edge: Edge) => {
            const rect = reactFlowWrapper.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
            setEdgeLabelEditor({
                edgeId: edge.id,
                text: String(edge.label ?? ''),
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            });
        },
        [setEdgeLabelEditor],
    );

    const onNodeDoubleClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            setNodeEditorDraft(draftFromNode(node));
        },
        [setNodeEditorDraft],
    );

    useEffect(
        () => {
            function handleKeyDown(e: KeyboardEvent) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                    e.preventDefault();
                    setSearchOpen(true);
                }
                if (e.key === 'Escape') {
                    setSearchOpen(false);
                }
            }
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        },
        [setSearchOpen],
    );

    const edgesWithSelection = useMemo(
        () =>
            plainEdges.map((edge) => ({
                ...edge,
                className: edge.id === selectedEdgeId ? 'selected' : undefined,
            })),
        [plainEdges, selectedEdgeId],
    );

    const commitNodes = useCallback(
        (next: Node[]) => {
            setFlowNodes(next);
            setSelectedNodes(next.filter((n) => n.selected));
        },
        [setSelectedNodes],
    );

    const onAlignNodes = useCallback(
        (alignment: AlignmentType) => {
            commitNodes(alignNodes(rflowDiagram.nodes as Node[], selectedNodes, alignment));
        },
        [commitNodes, selectedNodes],
    );

    const onDistributeNodes = useCallback(
        (direction: DistributionType) => {
            commitNodes(distributeNodes(rflowDiagram.nodes as Node[], selectedNodes, direction));
        },
        [commitNodes, selectedNodes],
    );

    const onDuplicateNodes = useCallback(
        () => {
            commitNodes(duplicateNodes(rflowDiagram.nodes as Node[], selectedNodes));
        },
        [commitNodes, selectedNodes],
    );

    const onDeleteSelected = useCallback(
        () => {
            const { newNodes, newEdges } = deleteSelected(rflowDiagram.nodes as Node[], rflowDiagram.edges as Edge[], selectedNodes, selectedEdges);
            setFlowNodes(newNodes);
            setFlowEdges(newEdges);
            setSelectedNodes([]);
            setSelectedEdges([]);
        },
        [selectedEdges, selectedNodes, setSelectedEdges, setSelectedNodes],
    );

    const onLockNodes = useCallback(
        () => {
            const next = lockNodes(rflowDiagram.nodes as Node[], selectedNodes);
            setFlowNodes(next);
            setSelectedNodes(
                selectedNodes
                    .map((n) => next.find((x) => x.id === n.id))
                    .filter((n): n is Node => n !== undefined),
            );
        },
        [selectedNodes, setSelectedNodes],
    );

    const onUnlockNodes = useCallback(
        () => {
            const next = unlockNodes(rflowDiagram.nodes as Node[], selectedNodes);
            setFlowNodes(next);
            setSelectedNodes(
                selectedNodes
                    .map((n) => next.find((x) => x.id === n.id))
                    .filter((n): n is Node => n !== undefined),
            );
        },
        [selectedNodes, setSelectedNodes],
    );

    const saveEdgeLabel = useCallback(
        (edgeId: string, text: string) => {
            setFlowEdges((rflowDiagram.edges as Edge[]).map((e) => (e.id === edgeId ? { ...e, label: text } : e)));
            setEdgeLabelEditor(null);
        },
        [setEdgeLabelEditor],
    );

    return (
        <>
            {exporting && (
                <div className="fixed inset-0 z-50 bg-background/90 flex flex-col items-center justify-center gap-3">
                    <BarsLoaderIcon />
                    <div className="text-sm text-muted-foreground">Exporting image...</div>
                </div>
            )}

            <NodeSearchDialog
                open={searchOpen}
                nodes={plainNodes}
                onOpenChange={setSearchOpen}
                onSelectNode={(id) => {
                    handleFocusNode(id);
                    setSearchOpen(false);
                }}
            />

            <div
                ref={reactFlowWrapper}
                className={classNames('relative h-full flex flex-col', isDragging && 'dragging', isDark && 'dark')}
            >
                <div className="px-2 py-1.5 border-b border-border bg-muted/20 shrink-0 flex flex-col gap-1.5">
                    <EditingToolbar
                        selectedNodes={selectedNodes}
                        selectedEdges={selectedEdges}
                        onAlignNodes={onAlignNodes}
                        onDistributeNodes={onDistributeNodes}
                        onDuplicateNodes={onDuplicateNodes}
                        onDeleteSelected={onDeleteSelected}
                        onLockNodes={onLockNodes}
                        onUnlockNodes={onUnlockNodes}
                        onSelectSubgraphContents={onSelectSubgraphContents}
                        onOpenSearch={() => setSearchOpen(true)}
                    />
                    <PaletteToolbar />
                </div>

                <div className="flex-1 min-h-0">
                    <ReactFlow
                        minZoom={0.05}
                        nodes={plainNodes}
                        edges={edgesWithSelection}
                        onlyRenderVisibleElements
                        onNodeDragStart={() => setIsDragging(true)}
                        onNodeDragStop={() => setIsDragging(false)}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeDoubleClick={onNodeDoubleClick}
                        nodeTypes={nodeTypes}
                        fitView
                        deleteKeyCode={['Delete', 'Backspace']}
                        panOnDrag
                        panOnScroll={false}
                        zoomOnScroll
                        zoomOnPinch
                        defaultEdgeOptions={{
                            type: 'smoothstep',
                            animated: true,
                            style: { stroke: '#1976D2', strokeWidth: 2.5 },
                            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#1976D2' },
                        }}
                        connectionLineType={ConnectionLineType.SmoothStep}
                        onEdgeClick={onEdgeClick}
                        onPaneClick={() => setSelectedEdgeId(null)}
                        edgesUpdatable
                        connectionMode={ConnectionMode.Loose}
                        onEdgeUpdate={(oldEdge, newConnection) => {
                            if (!newConnection.source || !newConnection.target) {
                                return;
                            }
                            setFlowEdges(
                                (rflowDiagram.edges as Edge[]).map((e) =>
                                    e.id === oldEdge.id
                                        ? { ...e, ...newConnection, source: newConnection.source!, target: newConnection.target! }
                                        : e
                                ),
                            );
                        }}
                        onEdgeDoubleClick={onEdgeDoubleClick}
                        onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            const type = event.dataTransfer.getData('application/reactflow');
                            if (!type) {
                                return;
                            }
                            const bounds = reactFlowWrapper.current!.getBoundingClientRect();
                            const position = reactFlowInstance.project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
                            const id = `${type}-${Date.now()}`;
                            let newNode: Node | undefined;
                            if (type === 'node') {
                                newNode = { id, type: 'custom', position, data: { label: 'New Node' }, style: { width: 150, height: 50 } };
                            } else if (type === 'subgraph') {
                                newNode = { id, type: 'group', position, data: { label: 'New Subgraph' }, style: { width: 220, height: 120, background: '#e3f2fd', border: '2px dashed #1976D2' } };
                            } else if (type === 'diamond') {
                                newNode = { id, type: 'diamond', position, data: { label: 'Conditional' }, style: { width: 120, height: 120, backgroundColor: '#FFF3E0', borderColor: '#F57C00' } };
                            }
                            if (newNode) {
                                setFlowNodes([...(rflowDiagram.nodes as Node[]), newNode]);
                            }
                        }}
                    >
                        <Background variant={BackgroundVariant.Dots} />
                        <Controls />
                        <MiniMap />
                    </ReactFlow>
                </div>
            </div>

            {edgeLabelEditor && (
                <EdgeLabelEditor
                    open
                    x={edgeLabelEditor.x}
                    y={edgeLabelEditor.y}
                    text={edgeLabelEditor.text}
                    onChange={(t) => setEdgeLabelEditor({ ...edgeLabelEditor, text: t })}
                    onSave={() => saveEdgeLabel(edgeLabelEditor.edgeId, edgeLabelEditor.text)}
                    onCancel={() => setEdgeLabelEditor(null)}
                />
            )}

            <NodeEditor />
        </>
    );
}

export function FlowDiagram() {
    return (
        <ReactFlowProvider>
            <FlowDiagramInternal />
        </ReactFlowProvider>
    );
}
