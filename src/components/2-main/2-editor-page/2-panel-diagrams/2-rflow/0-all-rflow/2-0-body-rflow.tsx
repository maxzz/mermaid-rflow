import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useSnapshot } from 'valtio';
import { classNames } from '@/utils';
import { appSettings } from '@/store/1-ui-settings';
import { toast } from 'sonner';
import { BarsLoaderIcon } from '@/ui/local-ui';

import { type Edge, type Node, ReactFlowProvider, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';

import { rf_Diagram } from '../8-store/a-0-flow-diagram';
import { rf_CanvasMethodsAtom, rf_DraggingAtom, rf_ExportingAtom, rf_PanModeAtom, rf_SearchDialogOpenAtom } from '../8-store/a-1-rflow-ui-atoms';

import { exportReactFlowImage } from '../1-canvas/8-export-image';

import { ZoomControls_Rflow } from './8-3-zoom-controls-rflow';
import { EdgeLabelEditorDialog } from '../4-dialogs/2-dlg-edge-label-editor';
import { NodeEditorDialog } from '../4-dialogs/1-dlg-node-editor';
import { NodeSearchDialog } from '../4-dialogs/4-dlg-node-search';

import { useFlowSourceLink } from './2-3-use-rflow-source-link';
import { RflowMarquee } from '../5-multi-select';
import { isThemeDark } from '@/utils/theme-utils';
import { doSelectSubgraphContentsAtom } from '../8-store/a-2-rflow-toolbars-atoms';
import { RflowToolbars } from './2-1-rflow-toolbars';
import { ReactFlowErrorGuard, RflowCanvas } from './2-2-rflow-canvas';

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
    const { theme } = useSnapshot(appSettings);
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

    const setSearchOpen = useSetAtom(rf_SearchDialogOpenAtom);
    const selectSubgraphContents = useSetAtom(doSelectSubgraphContentsAtom);
    const [exporting, setExporting] = useAtom(rf_ExportingAtom);
    const [isDragging] = useAtom(rf_DraggingAtom);
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

    useEffect(
        () => {
            setCanvasMethods({
                openSearch: () => setSearchOpen(true),
                exportImage: handleDownloadImage,
                selectSubgraphContents,
                fitView: () => reactFlowInstance.fitView({ padding: 0.2 }),
            });
            return () => setCanvasMethods({});
        },
        [handleDownloadImage, reactFlowInstance, selectSubgraphContents, setCanvasMethods, setSearchOpen]);

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
            <RflowToolbars />

            <div ref={canvasRef} className="relative flex-1 min-h-0 w-full">
                {hasBox ? <RflowCanvas sourceLink={sourceLink} anchorRef={reactFlowWrapper} /> : null}
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
