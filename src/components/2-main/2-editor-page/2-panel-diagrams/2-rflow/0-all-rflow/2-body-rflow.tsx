/**
 * Adapted from mermaid-reactflow-editor (MIT).
 * React Flow canvas bound to Valtio graph state and Jotai chrome.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useSnapshot } from 'valtio';
import { toast } from 'sonner';
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
    Controls,
    MarkerType,
    MiniMap,
    ReactFlowProvider,
    useReactFlow,
    useStoreApi,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { rflowDiagram, setRflowEdges, setRflowNodes } from '../store/1-flow-diagram';
import { syncMermaidFromGraph } from '../store/3-sync-with-source';
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
} from '../store/a-rflow-ui';
import { exportReactFlowImage } from '../canvas/exportImage';
import {
    alignNodes,
    deleteSelected,
    distributeNodes,
    duplicateNodes,
    lockNodes,
    unlockNodes,
} from '../canvas/diagramEditingUtils';
import { CustomNode, DiamondNode, SubgraphNode } from '../canvas/nodes';
import { EditingToolbar } from '../ui/2-rflow-toolbar';
import { PaletteToolbar } from '../ui/PaletteToolbar';
import { EdgeLabelEditor } from '../ui/5-2-dlg-edge-label-editor';
import { NodeEditor } from '../ui/5-1-dlg-node-editor';
import { NodeSearchDialog } from '../ui/NodeSearchDialog';
import { type AlignmentType, type DistributionType } from '../converter/constants';
import { nextRfId } from '../converter/mermaid-ids';
import { useFlowSourceLink } from '../canvas/useFlowSourceLink';
import { appSettings } from '@/store/1-ui-settings';
import { isThemeDark } from '@/utils/theme-utils';
import { classNames } from '@/utils';
import { BarsLoaderIcon } from '@/ui/local-ui';

export function Body_Rflow({ active = true }: { active?: boolean; }) {
    return (
        <ReactFlowProvider>
            <ReactFlowErrorGuard>
                <FlowDiagramInternal active={active} />
            </ReactFlowErrorGuard>
        </ReactFlowProvider>
    );
}

//---------------------------------------------------------------------------

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

function ReactFlowErrorGuard({ children }: { children: React.ReactNode; }) {
    const store = useStoreApi();
    if (store.getState().onError !== onReactFlowError) {
        store.getState().onError = onReactFlowError;
    }
    return children;
}

function FlowDiagramInternal({ active = true }: { active?: boolean; }) {
    const { nodes, edges } = useSnapshot(rflowDiagram);
    const { theme } = useSnapshot(appSettings);
    const isDark = isThemeDark(theme);
    const reactFlowInstance = useReactFlow();
    const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
    const [hasBox, setHasBox] = useState(false);

    useLayoutEffect(
        () => {
            const el = reactFlowWrapper.current;
            if (!el) {
                return;
            }
            const update = () => {
                setHasBox(el.clientWidth > 0 && el.clientHeight > 0);
            };
            update();
            const ro = new ResizeObserver(update);
            ro.observe(el);
            return () => ro.disconnect();
        },
        []);

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
    const sourceLink = useFlowSourceLink(plainNodes, plainEdges, reactFlowInstance, active);

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
        [reactFlowInstance, setExporting]);

    const onSelectSubgraphContents = useCallback(
        (subgraphNodeId?: string) => {
            if (!subgraphNodeId) {
                return;
            }
            const updatedNodes = (rflowDiagram.nodes as Node[]).map((n) => ({ ...n, selected: n.parentNode === subgraphNodeId }));
            const nodeIds = new Set(updatedNodes.filter((n) => n.parentNode === subgraphNodeId).map((n) => n.id));
            const updatedEdges = (rflowDiagram.edges as Edge[]).map((e) => ({ ...e, selected: nodeIds.has(e.source) && nodeIds.has(e.target) }));
            setRflowNodes(updatedNodes);
            setRflowEdges(updatedEdges);
            setSelectedNodes(updatedNodes.filter((n) => n.selected));
            setSelectedEdges(updatedEdges.filter((e) => e.selected));
        },
        [setSelectedEdges, setSelectedNodes]);

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
        [handleDownloadImage, onSelectSubgraphContents, reactFlowInstance, setCanvasMethods, setSearchOpen]);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            const updated = applyNodeChanges(changes, rflowDiagram.nodes as Node[]);
            setRflowNodes(updated);
            if (changes.some((c) => c.type === 'select')) {
                setSelectedNodes(updated.filter((n) => n.selected));
            }
            if (changes.some((c) => c.type === 'remove' || c.type === 'add')) {
                if (changes.some((c) => c.type === 'remove')) {
                    const ids = new Set(updated.map((n) => n.id));
                    const nextEdges = (rflowDiagram.edges as Edge[]).filter((e) => ids.has(e.source) && ids.has(e.target));
                    if (nextEdges.length !== rflowDiagram.edges.length) {
                        setRflowEdges(nextEdges);
                    }
                }
                syncMermaidFromGraph();
            }
        },
        [setSelectedNodes]);

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            const updated = applyEdgeChanges(changes, rflowDiagram.edges as Edge[]);
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
                addEdge(
                    {
                        ...defaultEdgeOptions,
                        ...connection,
                        data: { ...defaultEdgeOptions.data, mermaidType: '-->' },
                    },
                    rflowDiagram.edges as Edge[],
                ),
            );
            syncMermaidFromGraph();
        },
        []);

    const onEdgeClick = useCallback(
        (event: MouseEvent, edge: Edge) => {
            setSelectedEdgeId(edge.id);
            const updated = (rflowDiagram.edges as Edge[]).map((e) => ({ ...e, selected: e.id === edge.id }));
            setRflowEdges(updated);
            setSelectedEdges(updated.filter((e) => e.selected));
            sourceLink.onEdgeClick(event, edge);
        },
        [setSelectedEdgeId, setSelectedEdges, sourceLink.onEdgeClick]);

    const handleFocusNode = useCallback(
        (nodeId: string) => {
            reactFlowInstance.fitView({ nodes: [{ id: nodeId }], duration: 600, padding: 0.3 });
            const highlighted = (rflowDiagram.nodes as Node[]).map((n) =>
                n.id === nodeId ? { ...n, style: { ...n.style, outline: '3px solid #ff6b6b' } } : n
            );
            setRflowNodes(highlighted);
            window.setTimeout(
                () => {
                    setRflowNodes(
                        (rflowDiagram.nodes as Node[]).map((n) =>
                            n.id === nodeId ? { ...n, style: { ...n.style, outline: undefined } } : n
                        ),
                    );
                },
                1200,
            );
        },
        [reactFlowInstance]);

    const onEdgeDoubleClick = useCallback(
        (event: MouseEvent, edge: Edge) => {
            const rect = reactFlowWrapper.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
            setEdgeLabelEditor({
                edgeId: edge.id,
                text: String(edge.label ?? ''),
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            });
        },
        [setEdgeLabelEditor]);

    const onNodeDoubleClick = useCallback(
        (_event: MouseEvent, node: Node) => {
            setNodeEditorDraft(draftFromNode(node));
        },
        [setNodeEditorDraft]);

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
        [setSearchOpen]);

    const nodesWithLink = useMemo(
        () =>
            plainNodes.map((n) => ({
                ...n,
                className: classNames(n.className, sourceLink.classForNode(n)),
            })),
        [plainNodes, sourceLink.classForNode, sourceLink.keys, sourceLink.intensity]);

    const edgesWithSelection = useMemo(
        () =>
            plainEdges.map((edge) => ({
                ...edge,
                className: classNames(
                    edge.id === selectedEdgeId && 'selected',
                    sourceLink.classForEdge(edge),
                ),
            })),
        [plainEdges, selectedEdgeId, sourceLink.classForEdge, sourceLink.keys, sourceLink.intensity]);

    const commitNodes = useCallback(
        (next: Node[]) => {
            setRflowNodes(next);
            setSelectedNodes(next.filter((n) => n.selected));
        },
        [setSelectedNodes]);

    const onAlignNodes = useCallback(
        (alignment: AlignmentType) => {
            commitNodes(alignNodes(rflowDiagram.nodes as Node[], selectedNodes, alignment));
        },
        [commitNodes, selectedNodes]);

    const onDistributeNodes = useCallback(
        (direction: DistributionType) => {
            commitNodes(distributeNodes(rflowDiagram.nodes as Node[], selectedNodes, direction));
        },
        [commitNodes, selectedNodes]);

    const onDuplicateNodes = useCallback(
        () => {
            commitNodes(duplicateNodes(rflowDiagram.nodes as Node[], selectedNodes));
            syncMermaidFromGraph();
        },
        [commitNodes, selectedNodes]);

    const onDeleteSelected = useCallback(
        () => {
            const { newNodes, newEdges } = deleteSelected(rflowDiagram.nodes as Node[], rflowDiagram.edges as Edge[], selectedNodes, selectedEdges);
            setRflowNodes(newNodes);
            setRflowEdges(newEdges);
            setSelectedNodes([]);
            setSelectedEdges([]);
            syncMermaidFromGraph();
        },
        [selectedEdges, selectedNodes, setSelectedEdges, setSelectedNodes]);

    const onLockNodes = useCallback(
        () => {
            const next = lockNodes(rflowDiagram.nodes as Node[], selectedNodes);
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
            const next = unlockNodes(rflowDiagram.nodes as Node[], selectedNodes);
            setRflowNodes(next);
            setSelectedNodes(
                selectedNodes
                    .map((n) => next.find((x) => x.id === n.id))
                    .filter((n): n is Node => n !== undefined),
            );
        },
        [selectedNodes, setSelectedNodes]);

    const saveEdgeLabel = useCallback(
        (edgeId: string, text: string) => {
            setRflowEdges((rflowDiagram.edges as Edge[]).map((e) => (e.id === edgeId ? { ...e, label: text } : e)));
            setEdgeLabelEditor(null);
            syncMermaidFromGraph();
        },
        [setEdgeLabelEditor]);

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

            <div ref={reactFlowWrapper} className={classNames(containerClasses, isDragging && containerDraggingClasses, isDark && 'dark',)}>
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

                <div className="flex-1 min-h-0 w-full">
                    {hasBox
                        ? (
                            <ReactFlow
                                minZoom={0.05}
                                nodes={nodesWithLink}
                                edges={edgesWithSelection}
                                onlyRenderVisibleElements
                                onNodeDragStart={() => setIsDragging(true)}
                                onNodeDragStop={() => setIsDragging(false)}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onNodeClick={sourceLink.onNodeClick}
                                onNodeDoubleClick={onNodeDoubleClick}
                                nodeTypes={nodeTypes}
                                defaultEdgeOptions={defaultEdgeOptions}
                                onError={onReactFlowError}
                                fitView
                                deleteKeyCode={['Delete', 'Backspace']}
                                panOnDrag
                                panOnScroll={false}
                                zoomOnScroll
                                zoomOnPinch
                                connectionLineType={ConnectionLineType.SmoothStep}
                                onEdgeClick={onEdgeClick}
                                onPaneClick={() => {
                                    setSelectedEdgeId(null);
                                    sourceLink.onPaneClick();
                                }}
                                edgesUpdatable
                                connectionMode={ConnectionMode.Loose}
                                onEdgeUpdate={(oldEdge, newConnection) => {
                                    if (!newConnection.source || !newConnection.target) {
                                        return;
                                    }
                                    setRflowEdges(
                                        (rflowDiagram.edges as Edge[]).map(
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
                                    const current = rflowDiagram.nodes as Node[];
                                    let newNode: Node | undefined;
                                    if (type === 'node') {
                                        newNode = {
                                            id: nextRfId(current, 'n'),
                                            type: 'custom',
                                            position,
                                            data: { label: 'New Node', shape: 'rect' },
                                            style: { width: 150, height: 50 },
                                        };
                                    } else if (type === 'subgraph') {
                                        newNode = {
                                            id: nextRfId(current, 'sg'),
                                            type: 'group',
                                            position,
                                            data: { label: 'New Subgraph', isSubgraph: true },
                                            style: { width: 220, height: 120, background: '#e3f2fd', border: '2px dashed #1976D2' },
                                        };
                                    } else if (type === 'diamond') {
                                        newNode = {
                                            id: nextRfId(current, 'd'),
                                            type: 'diamond',
                                            position,
                                            data: { label: 'Conditional', shape: 'diamond' },
                                            style: { width: 120, height: 120, backgroundColor: '#FFF3E0', borderColor: '#F57C00' },
                                        };
                                    }
                                    if (newNode) {
                                        setRflowNodes([...current, newNode]);
                                        syncMermaidFromGraph();
                                    }
                                }}
                            >
                                <Background variant={BackgroundVariant.Dots} />
                                <Controls />
                                <MiniMap />
                            </ReactFlow>
                        )
                        : null}
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

const containerClasses = " \
relative w-full h-full flex flex-col \
[&_.react-flow__node-custom]:shadow-none! \
[&_.react-flow__node-custom]:outline-none! \
[&_.react-flow__node-diamond]:bg-transparent! \
[&_.react-flow__node-diamond]:border-none! \
[&_.react-flow__node-diamond]:shadow-none! \
[&_.react-flow__node-diamond]:outline-none! \
[&_.react-flow__node-diamond.react-flow__node-selected]:bg-transparent! \
[&_.react-flow__node-diamond.react-flow__node-selected]:border-none! \
[&_.react-flow__node-diamond.react-flow__node-selected]:shadow-none! \
[&_.react-flow__node-diamond.react-flow__node-selected]:outline-none! \
[&_.react-flow__node-group]:cursor-move \
[&_.react-flow__node-group.selected]:shadow-[0_0_0_2px_#1976d2]! \
[&_.react-flow__edge-text]:text-xs! [&_.react-flow__edge-text]:font-medium! \
[&_.react-flow__handle]:opacity-0 \
[&_.react-flow__handle]:scale-[0.8] \
[&_.react-flow__handle]:transition-[opacity,transform] \
[&_.react-flow__handle]:duration-200 \
[&_.react-flow__node:hover_.react-flow__handle]:opacity-100 \
[&_.react-flow__node:hover_.react-flow__handle]:scale-100 \
[&_.react-flow__node.selected_.react-flow__handle]:opacity-100 \
[&_.react-flow__node.selected_.react-flow__handle]:scale-100 \
[&_.react-flow__handle]:z-60! \
[&_.react-flow__handle]:pointer-events-auto! \
[&_.react-flow__resize-control]:z-60! \
[&_.react-flow__resize-control]:pointer-events-auto! \
[&_.react-flow__panel]:z-60! \
[&_.react-flow__panel]:pointer-events-auto! \
[&_.react-flow__controls]:z-60! \
[&_.react-flow__controls]:pointer-events-auto! \
[&_.react-flow__edge.selected_path]:stroke-[var(--edge-selected,#ff9800)!important] \
[&_.react-flow__edge.selected_path]:[stroke-width:2px!important] \
[&_.react-flow__edge.selected_path]:drop-shadow-[0_0_2px_var(--edge-selected-shadow,#ff9800aa)] \
[&_.react-flow__edge.selected_.react-flow__edge-text]:fill-[var(--edge-selected,#ff9800)!important] \
[&_.react-flow__edge.selected_.react-flow__edge-text]:font-bold! \
";

const containerDraggingClasses = " \
[&_.react-flow__edge.animated_path]:animate-none \
[&_.react-flow__edge.animated_path]:[stroke-dasharray:none] \
[&_.react-flow__node-resizer]:invisible \
[&_.react-flow__handle]:invisible";