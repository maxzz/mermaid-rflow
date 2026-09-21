import { useLayoutEffect, useRef, useState } from 'react';
import { getDefaultStore, useAtomValue } from 'jotai';
import { useSnapshot } from 'valtio';
import { classNames } from '@/utils';
import { isThemeDark } from '@/utils/theme-utils';
import { appSettings } from '@/store/1-ui-settings';
import { ZOOM_STEP } from '@/store/2-mermaid-settings';
import { bindLastMermaidFunctions } from '../render/2-render-official';
import { mmdDiagram } from '../store/1-mmd-diagram';
import { mmdSettings } from '../store/2-mmd-settings';
import { mmdPanAtom, mmdPanModeAtom, mmdZoomAtom } from '../store/3-mmd-ui';
import { MmdPaletteRail } from '../ui/MmdPaletteRail';
import { MmdViewControls } from '../ui/MmdViewControls';
import { fitMmdToView, measureMmdNaturalSize, normalizeMmdSvg, setMmdZoom } from '../canvas/mmd-zoom';
import { MmdEditOverlay } from '../canvas/MmdEditOverlay';
import { useMmdLayout } from '../canvas/useMmdLayout';
import { useMmdSourceLink } from '../canvas/useMmdSourceLink';
import { usePanToTranslate } from './use-pan-to-translate';
import '../styles/8-mmd-view.css';

export function Body_Mmd({ active = true }: { active?: boolean; }) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const boardRef = useRef<HTMLDivElement>(null);
    const hostRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const { svg, error } = useSnapshot(mmdDiagram);
    const { autofit } = useSnapshot(mmdSettings);
    const { theme } = useSnapshot(appSettings);
    const zoom = useAtomValue(mmdZoomAtom);
    const pan = useAtomValue(mmdPanAtom);
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
        [svg]);

    useMmdSourceLink({
        contentRef,
        hostRef: viewportRef,
        viewportRef,
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
            if (svgEl instanceof SVGSVGElement) {
                setNatural(normalizeMmdSvg(svgEl));
                return;
            }
            setNatural(measureMmdNaturalSize(root));
        },
        [svg]);

    useLayoutEffect(
        () => {
            if (autofit && enabled && active) {
                fitMmdToView(viewportRef.current, contentRef.current);
            }
        },
        [active, autofit, enabled, svg, natural.w, natural.h]);

    useLayoutEffect(
        () => {
            const viewport = viewportRef.current;
            if (!viewport || !autofit) {
                return;
            }
            const ro = new ResizeObserver(() => {
                if (mmdSettings.autofit) {
                    fitMmdToView(viewport, contentRef.current);
                }
            });
            ro.observe(viewport);

            return () => ro.disconnect();
        },
        [autofit, enabled]);

    useLayoutEffect(
        () => {
            const viewport = viewportRef.current;
            if (!viewport) {
                return;
            }
            function onWheel(e: WheelEvent) {
                e.preventDefault();
                mmdSettings.autofit = false;
                const store = getDefaultStore();
                if (e.ctrlKey || e.metaKey) {
                    const currentZoom = store.get(mmdZoomAtom);
                    setMmdZoom(e.deltaY < 0 ? currentZoom * ZOOM_STEP : currentZoom / ZOOM_STEP, viewport);
                    return;
                }
                const current = store.get(mmdPanAtom);
                store.set(mmdPanAtom, { x: current.x - e.deltaX, y: current.y - e.deltaY });
            }
            viewport.addEventListener('wheel', onWheel, { passive: false });

            return () => viewport.removeEventListener('wheel', onWheel);
        },
        []);

    const panHandlers = usePanToTranslate(boardRef, panMode);

    return (
        <div className="relative h-full">
            <div
                ref={viewportRef}
                className={classNames('absolute inset-0 overflow-hidden touch-none', dark ? 'mmd-grid-dark' : 'mmd-grid-light', panMode && 'cursor-grab select-none')}
                {...panHandlers}
            >
                {error
                    ? (
                        <div className="absolute inset-0 p-6 flex items-center justify-center">
                            <pre className="whitespace-pre-wrap px-4 py-3 max-w-full text-xs font-code text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
                                {error}
                            </pre>
                        </div>
                    )
                    : !svg
                        ? (
                            <div className="absolute inset-0 text-sm text-muted-foreground flex items-center justify-center">
                                Start typing to render your diagram
                            </div>
                        )
                        : (
                            <div
                                ref={boardRef}
                                className="absolute top-0 left-0"
                                style={natural.w > 0 && natural.h > 0
                                    ? {
                                        width: natural.w * zoom,
                                        height: natural.h * zoom,
                                        transform: `translate(${pan.x}px, ${pan.y}px)`,
                                    }
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
                        )
                }
            </div>

            <MmdPaletteRail />
            <MmdViewControls viewportRef={viewportRef} contentRef={contentRef} />
        </div>
    );
}
