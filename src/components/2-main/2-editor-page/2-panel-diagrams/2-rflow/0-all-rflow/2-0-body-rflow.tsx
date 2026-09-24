import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useSnapshot } from 'valtio';
import { classNames } from '@/utils';
import { appSettings } from '@/store/1-ui-settings';
import { toast } from 'sonner';
import { BarsLoaderIcon } from '@/ui/local-ui';

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
    ReactFlowProvider,
    useReactFlow,
    useStoreApi,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { rf_Diagram, setRflowEdges, setRflowNodes } from '../8-store/0-flow-diagram';
import { draftFromNode, rf_CanvasMethodsAtom, rf_DraggingAtom, rf_EdgeLabelEditorAtom, rf_ExportingAtom, rf_NodeEditorDraftAtom, rf_PanModeAtom, rf_SearchDialogOpenAtom, rf_SelectedEdgesAtom, rf_SelectedNodesAtom } from '../8-store/a-rflow-ui-atoms';
import { syncMermaidFromGraph } from '../8-store/1-sync-with-source';

import { exportReactFlowImage } from '../1-canvas/8-export-image';
import { deleteSelected, duplicateNodes, lockNodes, unlockNodes } from '../1-canvas/8-diagram-editing-utils';
import { CustomNode, DiamondNode, SubgraphNode } from '../1-canvas/nodes';

import { EditingToolbar } from './8-1-1-0-toolbar-rflow';
import { PaletteToolbar } from './8-1-3-palette-toolbar';
import { ZoomControls_Rflow } from './8-3-zoom-controls-rflow';
import { EdgeLabelEditorDialog } from '../4-dialogs/2-dlg-edge-label-editor';
import { NodeEditorDialog } from '../4-dialogs/1-dlg-node-editor';
import { NodeSearchDialog } from '../4-dialogs/4-dlg-node-search';

import { nextRfId } from '../2-converter/8-mermaid-ids';
import { useFlowSourceLink } from './2-1-use-rflow-source-link';
import { RflowMarquee } from '../5-multi-select';

import { ZOOM_MAX, ZOOM_MIN } from '@/store/2-mermaid-settings';
import { isThemeDark } from '@/utils/theme-utils';

export function Body_Rflow({ active = true }: { active?: boolean; }) {
    return (<>
        <ReactFlowProvider>
            <ReactFlowErrorGuard>
                <RflowDiagramView active={active} />
            </ReactFlowErrorGuard>
        </ReactFlowProvider>

        <EdgeLabelEditorDialog />
        <NodeEditorDialog />
    </>);
}

function RflowDiagramView({ active = true }: { active?: boolean; }) {
    const { nodes, edges } = useSnapshot(rf_Diagram);
    const { theme, rflow } = useSnapshot(appSettings);
    const isDark = isThemeDark(theme);
    const reactFlowInstance = useReactFlow();
    const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLDivElement | null>(null);
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

    const [selectedNodes, setSelectedNodes] = useAtom(rf_SelectedNodesAtom);
    const [selectedEdges, setSelectedEdges] = useAtom(rf_SelectedEdgesAtom);
    const setSearchOpen = useSetAtom(rf_SearchDialogOpenAtom);
    const setEdgeLabelEditor = useSetAtom(rf_EdgeLabelEditorAtom);
    const setNodeEditorDraft = useSetAtom(rf_NodeEditorDraftAtom);
    const [exporting, setExporting] = useAtom(rf_ExportingAtom);
    const [isDragging, setIsDragging] = useAtom(rf_DraggingAtom);
    const [panMode] = useAtom(rf_PanModeAtom);
    const setCanvasMethods = useSetAtom(rf_CanvasMethodsAtom);

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
                nodes: rf_Diagram.nodes as Node[],
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
            const updatedNodes = (rf_Diagram.nodes as Node[]).map((n) => ({ ...n, selected: n.parentNode === subgraphNodeId }));
            const nodeIds = new Set(updatedNodes.filter((n) => n.parentNode === subgraphNodeId).map((n) => n.id));
            const updatedEdges = (rf_Diagram.edges as Edge[]).map((e) => ({ ...e, selected: nodeIds.has(e.source) && nodeIds.has(e.target) }));
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
                addEdge(
                    {
                        ...defaultEdgeOptions,
                        ...connection,
                        data: { ...defaultEdgeOptions.data, mermaidType: '-->' },
                    },
                    rf_Diagram.edges as Edge[],
                ),
            );
            syncMermaidFromGraph();
        },
        []);

    const onEdgeClick = useCallback(
        (event: MouseEvent, edge: Edge) => {
            sourceLink.onEdgeClick(event, edge);
        },
        [sourceLink.onEdgeClick]);

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
            const abortController = new AbortController();
            window.addEventListener('keydown', handleKeyDown, { signal: abortController.signal });
            return () => abortController.abort();
        },
        [setSearchOpen]);

    const nodesWithLink = useMemo(
        () => (
            plainNodes.map((n) => ({ ...n, className: classNames(n.className, sourceLink.classForNode(n)) }))
        ),
        [plainNodes, sourceLink.classForNode, sourceLink.keys, sourceLink.intensity]);

    const edgesWithSelection = useMemo(
        () => (
            plainEdges.map(
                (edge) => ({ ...edge, className: classNames(edge.className, sourceLink.classForEdge(edge)) })
            )
        ),
        [plainEdges, sourceLink.classForEdge, sourceLink.keys, sourceLink.intensity]);

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

    return (<>
        {exporting && (
            <div className="fixed inset-0 z-50 bg-background/90 flex flex-col items-center justify-center gap-3">
                <BarsLoaderIcon />
                <div className="text-sm text-muted-foreground">
                    Exporting image...
                </div>
            </div>
        )}

        <NodeSearchDialog />

        <div ref={reactFlowWrapper} className={classNames(containerClasses, isDragging && containerDraggingClasses, isDark && 'dark',)}>
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

            <div ref={canvasRef} className="relative flex-1 min-h-0 w-full">
                {hasBox
                    ? (
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
                            panOnScroll={false}
                            zoomOnScroll
                            zoomOnPinch
                            connectionLineType={ConnectionLineType.SmoothStep}
                            onEdgeClick={onEdgeClick}
                            onPaneClick={sourceLink.onPaneClick}
                            edgesUpdatable
                            connectionMode={ConnectionMode.Loose}
                            onEdgeUpdate={(oldEdge, newConnection) => {
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
                                const current = rf_Diagram.nodes as Node[];
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
                            {rflow.showBgGrid && <Background variant={BackgroundVariant.Dots} />}
                            {rflow.showMinimap && <MiniMap />}

                        </ReactFlow>
                    )
                    : null
                }
                {/* Shift-click toggles via multiSelectionKeyCode. Shift-drag adds blocks fully inside the rectangle. */}
                <RflowMarquee surfaceRef={canvasRef} enabled={hasBox && active && !panMode} onBackgroundClick={sourceLink.onPaneClick} />
                {hasBox && !exporting && <ZoomControls_Rflow />}
            </div>
        </div>
    </>);
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
