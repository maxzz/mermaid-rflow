import { type PointerEvent, type RefObject, type WheelEvent, useLayoutEffect, useRef } from 'react';
import { getDefaultStore, useAtom, useAtomValue } from 'jotai';
import { useSnapshot } from 'valtio';
import { HandIcon, MaximizeIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { classNames } from '@/utils';
import { isThemeDark } from '@/utils/theme-utils';
import { appSettings } from '@/store/1-ui-settings';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '@/store/2-mermaid-settings';
import { Button } from '@/ui/shadcn/button';
import { bindLastMermaidFunctions } from '../render/2-render-official';
import { mmdDiagram } from '../store/1-mmd-diagram';
import { mmdSettings } from '../store/2-mmd-settings';
import { mmdPanModeAtom, mmdZoomAtom } from '../store/3-mmd-ui';
import { MmdEditOverlay } from './MmdEditOverlay';
import { useMmdSourceLink } from './useMmdSourceLink';
import '../styles/8-mmd-view.css';

export function MermaidView() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const hostRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const { svg, error } = useSnapshot(mmdDiagram);
    const { autofit } = useSnapshot(mmdSettings);
    const { theme } = useSnapshot(appSettings);
    const zoom = useAtomValue(mmdZoomAtom);
    const panMode = useAtomValue(mmdPanModeAtom);
    const dark = isThemeDark(theme);
    const enabled = !!svg && !error;

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
            <MmdZoomControls scrollRef={scrollRef} contentRef={contentRef} />
        </div>
    );
}

function MmdZoomControls({ scrollRef, contentRef }: { scrollRef: RefObject<HTMLDivElement | null>; contentRef: RefObject<HTMLDivElement | null>; }) {
    const [zoom] = useAtom(mmdZoomAtom);
    const [panMode, setPanMode] = useAtom(mmdPanModeAtom);
    const { autofit } = useSnapshot(mmdSettings);

    return (
        <div className="absolute left-4 bottom-4 px-1 py-0.5 text-xs bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-sm flex items-center gap-0.5">
            <Button variant="ghost" size="icon-xs" onClick={() => setMmdZoom(zoom / ZOOM_STEP)} disabled={zoom <= ZOOM_MIN} title="Zoom out">
                <ZoomOutIcon />
            </Button>
            <button
                className="min-w-10 font-mono tabular-nums text-[.7rem] text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setMmdZoom(1)}
                title="Reset zoom to 100%"
                type="button"
            >
                {Math.round(zoom * 100)}%
            </button>
            <Button variant="ghost" size="icon-xs" onClick={() => setMmdZoom(zoom * ZOOM_STEP)} disabled={zoom >= ZOOM_MAX} title="Zoom in">
                <ZoomInIcon />
            </Button>
            <Button
                variant="ghost"
                size="icon-xs"
                title={autofit ? 'Fit (autofit on)' : 'Fit to view'}
                onClick={() => {
                    mmdSettings.autofit = true;
                    fitMmdToView(scrollRef.current, contentRef.current);
                }}
            >
                <MaximizeIcon />
            </Button>
            <Button
                className={classNames(panMode && 'bg-muted text-foreground')}
                variant="ghost"
                size="icon-xs"
                onClick={() => setPanMode((v) => !v)}
                title={panMode ? 'Pan mode on: drag to scroll' : 'Pan mode: drag to scroll'}
                aria-pressed={panMode}
            >
                <HandIcon />
            </Button>
        </div>
    );
}

function setMmdZoom(next: number) {
    getDefaultStore().set(mmdZoomAtom, Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next)));
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

function fitMmdToView(container: HTMLElement | null, content: HTMLElement | null) {
    if (!container || !content) {
        setMmdZoom(1);
        return;
    }
    const svg = content.querySelector('svg');
    const naturalW = svg instanceof SVGSVGElement
        ? (svg.viewBox.baseVal.width || svg.width.baseVal.value || content.offsetWidth)
        : content.offsetWidth;
    const naturalH = svg instanceof SVGSVGElement
        ? (svg.viewBox.baseVal.height || svg.height.baseVal.value || content.offsetHeight)
        : content.offsetHeight;
    if (naturalW <= 0 || naturalH <= 0) {
        setMmdZoom(1);
        return;
    }
    const padding = 56;
    const fit = Math.min((container.clientWidth - padding) / naturalW, (container.clientHeight - padding) / naturalH);
    setMmdZoom(fit);
}
