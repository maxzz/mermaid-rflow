import { type PointerEvent, type RefObject, type WheelEvent, useLayoutEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useSnapshot } from 'valtio';
import { classNames } from '@/utils';
import { isThemeDark } from '@/utils/theme-utils';
import { appSettings } from '@/store/1-ui-settings';
import { ZOOM_STEP } from '@/store/2-mermaid-settings';
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

export function MermaidView({ active = true }: { active?: boolean; }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const paneRef = useRef<HTMLDivElement>(null);
    const boardRef = useRef<HTMLDivElement>(null);
    const hostRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const { svg, error } = useSnapshot(mmdDiagram);
    const { autofit } = useSnapshot(mmdSettings);
    const { theme } = useSnapshot(appSettings);
    const zoom = useAtomValue(mmdZoomAtom);
    const panMode = useAtomValue(mmdPanModeAtom);
    const dark = isThemeDark(theme);
    const enabled = !!svg && !error;
    const [natural, setNatural] = useState({ w: 0, h: 0 });

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
        hostRef: paneRef,
        scrollRef,
        enabled,
        active,
        output: svg,
        panMode,
    });

    useMmdLayout({
        contentRef,
        enabled,
        output: svg,
    });

    useLayoutEffect(
        () => {
            const root = contentRef.current;
            if (!root || !svg) {
                setNatural({ w: 0, h: 0 });
                return;
            }
            const svgEl = root.querySelector('svg');
            const w = svgEl instanceof SVGSVGElement
                ? (svgEl.viewBox.baseVal.width || svgEl.width.baseVal.value || root.offsetWidth)
                : root.offsetWidth;
            const h = svgEl instanceof SVGSVGElement
                ? (svgEl.viewBox.baseVal.height || svgEl.height.baseVal.value || root.offsetHeight)
                : root.offsetHeight;
            setNatural({ w, h });
        },
        [svg],
    );

    useLayoutEffect(
        () => {
            if (autofit && enabled && active) {
                fitMmdToView(scrollRef.current, contentRef.current);
            }
        },
        [active, autofit, enabled, svg],
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
                <div ref={paneRef} className="relative min-w-full min-h-full p-6 flex">
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
                                    ref={boardRef}
                                    className="relative m-auto"
                                    style={natural.w > 0 && natural.h > 0
                                        ? { width: natural.w * zoom, height: natural.h * zoom }
                                        : undefined}
                                >
                                    <div
                                        ref={hostRef}
                                        className="relative origin-top-left"
                                        style={natural.w > 0 && natural.h > 0
                                            ? { width: natural.w, height: natural.h, transform: `scale(${zoom})` }
                                            : undefined}
                                    >
                                        <div
                                            ref={contentRef}
                                            className="mmd-host"
                                            dangerouslySetInnerHTML={{ __html: svg }}
                                        />
                                    </div>
                                    <div className="absolute inset-0 z-5 pointer-events-none">
                                        <MmdEditOverlay
                                            hostRef={boardRef}
                                            contentRef={contentRef}
                                            enabled={enabled}
                                            active={active}
                                            layoutKey={`${natural.w}x${natural.h}:${zoom}`}
                                        />
                                    </div>
                                </div>
                            )}
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
        if (!el || (e.button !== 0 && !middleButton)) {
            return;
        }
        if (e.button === 0 && !panMode && e.target instanceof Element && e.target.closest('[data-mmd-hit], [data-mmd-chrome]')) {
            return;
        }
        if (!panMode && !middleButton && e.target instanceof Element && e.target.closest('g.node, [data-mmd-hit]')) {
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
