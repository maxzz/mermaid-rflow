import { type PointerEvent, type RefObject, type WheelEvent, useLayoutEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { useSnapshot } from 'valtio';
import { classNames } from '@/utils';
import { isThemeDark } from '@/utils/theme-utils';
import { appSettings } from '@/store/1-ui-settings';
import { ZOOM_STEP, mermaidSettings } from '@/store/2-mermaid-settings';
import { classifyMermaidSource, isFlowchartDiagramType } from '../catalog/1-flowchart-source';
import { bindLastMermaidFunctions } from '../render/2-render-official';
import { mmdDiagram } from '../store/1-mmd-diagram';
import { mmdSettings } from '../store/2-mmd-settings';
import { mmdPanModeAtom, mmdZoomAtom } from '../store/3-mmd-ui';
import { MmdPaletteRail } from '../ui/MmdPaletteRail';
import { MmdViewControls } from '../ui/MmdViewControls';
import { fitMmdToView, setMmdZoom } from './mmd-zoom';
import { MmdEditOverlay } from './MmdEditOverlay';
import { useMmdLayout } from './useMmdLayout';
import { useMmdSourceLink } from './useMmdSourceLink';
import '../styles/8-mmd-view.css';

export function MermaidView() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const hostRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const { svg, error, diagramType } = useSnapshot(mmdDiagram);
    const { source } = useSnapshot(mermaidSettings);
    const { autofit } = useSnapshot(mmdSettings);
    const { theme } = useSnapshot(appSettings);
    const zoom = useAtomValue(mmdZoomAtom);
    const panMode = useAtomValue(mmdPanModeAtom);
    const dark = isThemeDark(theme);
    const enabled = !!svg && !error;
    const flowchart = classifyMermaidSource(source) === 'flowchart' || isFlowchartDiagramType(diagramType);

    useLayoutEffect(
        () => {
            const root = contentRef.current;
            if (!root || !svg) {
                return;
            }
            bindLastMermaidFunctions(root);
        },
        [svg],
    );

    useMmdSourceLink({
        contentRef,
        hostRef,
        scrollRef,
        enabled,
        output: svg,
        panMode,
    });

    useMmdLayout({
        contentRef,
        hostRef,
        enabled,
        flowchart,
        panMode,
        output: svg,
    });

    useLayoutEffect(
        () => {
            if (autofit && enabled) {
                fitMmdToView(scrollRef.current, contentRef.current);
            }
        },
        [autofit, enabled, svg],
    );

    const panHandlers = usePanToScroll(scrollRef, panMode);

    function onWheel(e: WheelEvent<HTMLDivElement>) {
        if (!e.ctrlKey && !e.metaKey) {
            return;
        }
        e.preventDefault();
        mmdSettings.autofit = false;
        setMmdZoom(e.deltaY < 0 ? zoom * ZOOM_STEP : zoom / ZOOM_STEP);
    }

    return (
        <div className="absolute inset-0">
            <div
                ref={scrollRef}
                className={classNames(
                    'absolute inset-0 overflow-auto',
                    dark ? 'mmd-grid-dark' : 'mmd-grid-light',
                    panMode && 'cursor-grab select-none',
                )}
                onWheel={onWheel}
                {...panHandlers}
            >
                <div ref={hostRef} className="relative min-w-full min-h-full p-6 flex">
                    {error
                        ? (
                            <pre className="m-auto px-4 py-3 max-w-full text-xs font-code text-destructive bg-destructive/10 border border-destructive/30 rounded-md whitespace-pre-wrap">
                                {error}
                            </pre>
                        )
                        : !svg
                            ? (
                                <div className="m-auto text-sm text-muted-foreground">
                                    Start typing to render your diagram
                                </div>
                            )
                            : (
                                <div
                                    ref={contentRef}
                                    className={classNames('mmd-host m-auto', autofit && 'mmd-autofit w-full')}
                                    style={{ zoom }}
                                    dangerouslySetInnerHTML={{ __html: svg }}
                                />
                            )}
                    <MmdEditOverlay hostRef={hostRef} contentRef={contentRef} enabled={enabled} />
                </div>
            </div>
            <MmdPaletteRail />
            <MmdViewControls scrollRef={scrollRef} contentRef={contentRef} />
        </div>
    );
}

function usePanToScroll(scrollRef: RefObject<HTMLDivElement | null>, panMode: boolean) {
    const dragRef = useRef<{ x: number; y: number; left: number; top: number; } | null>(null);

    function onPointerDown(e: PointerEvent<HTMLDivElement>) {
        const el = scrollRef.current;
        const middleButton = e.button === 1;
        if (!el || (!panMode && !middleButton) || (e.button !== 0 && !middleButton)) {
            return;
        }
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        dragRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
        el.style.cursor = 'grabbing';
    }

    function onPointerMove(e: PointerEvent<HTMLDivElement>) {
        const el = scrollRef.current;
        const drag = dragRef.current;
        if (!el || !drag) {
            return;
        }
        el.scrollLeft = drag.left - (e.clientX - drag.x);
        el.scrollTop = drag.top - (e.clientY - drag.y);
    }

    function onPointerUp(e: PointerEvent<HTMLDivElement>) {
        const el = scrollRef.current;
        if (el && dragRef.current) {
            el.releasePointerCapture(e.pointerId);
            el.style.cursor = '';
        }
        dragRef.current = null;
    }

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}
