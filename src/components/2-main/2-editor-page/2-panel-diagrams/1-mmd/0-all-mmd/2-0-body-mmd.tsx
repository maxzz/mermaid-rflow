import { useLayoutEffect, useRef, useState } from 'react';
import { getDefaultStore, useAtomValue } from 'jotai';
import { useSnapshot } from 'valtio';
import { classNames } from '@/utils';

import { isThemeDark } from '@/utils/theme-utils';
import { appSettings } from '@/store/1-ui-settings';

import { ZOOM_STEP } from '@/store/2-mermaid-settings';
import { bindLastMermaidFunctions } from '../1-1-render/2-render-official';
import { mmdDiagram } from '../8-store/1-mmd-diagram';
import { mmdSettings } from '../8-store/2-mmd-settings';
import { mmdPanAtom, mmdPanModeAtom, mmdZoomAtom } from '../8-store/3-mmd-ui-atoms';
import { MmdPaletteRail } from './8-1-2-0-mmd-palette-rail';
import { ZoomControls_Mmd } from './8-3-1-zoom-controls-mmd';
import { fitMmdToView, measureMmdNaturalSize, normalizeMmdSvg, setMmdZoom } from './8-3-2-mmd-zoom-utils';
import { MmdEditOverlay } from '../1-2-overlay/0-mmd-edit-overlay';
import { useMmdLayout } from './2-1-use-mmd-layout';
import { useMmdSourceLink } from './2-2-use-mmd-source-link';
import { usePanToTranslate } from './use-pan-to-translate';

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
        <div className="relative size-full overflow-hidden">
            <div
                ref={viewportRef}
                className={classNames('absolute inset-0 overflow-hidden touch-none bg-size-[22px_22px]',
                    dark
                        ? 'bg-[radial-gradient(circle,color-mix(in_oklab,var(--foreground)_18%,transparent)_1.15px,transparent_1.15px)]'
                        : 'bg-[radial-gradient(circle,color-mix(in_oklab,var(--foreground)_12%,transparent)_1.15px,transparent_1.15px)]',
                    panMode && 'cursor-grab select-none',
                )}
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
                                className={boardClasses}
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
                                    style={natural.w > 0 && natural.h > 0 ? { width: natural.w, height: natural.h, transform: `scale(${zoom})` } : undefined}
                                >
                                    <div ref={contentRef} className={containerClasses} dangerouslySetInnerHTML={{ __html: svg }} />
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
            <ZoomControls_Mmd viewportRef={viewportRef} contentRef={contentRef} />
        </div>
    );
}

const boardClasses = "\
absolute \
top-0 \
left-0 \
[&.is-mmd-dragging]:cursor-grabbing \
[&.is-mmd-dragging_g.node]:cursor-grabbing \
[&.is-mmd-dragging_[data-mmd-hit]]:cursor-grabbing \
[&.is-mmd-dragging_[data-mmd-add-handle]]:hidden \
[&.is-mmd-dragging_[data-mmd-edge-handle]]:hidden \
";

const containerClasses = "\
[&_svg]:max-w-none [&_svg]:block \
[&_svg]:overflow-visible \
[&.source-link-interactive_g.node]:cursor-grab \
[&.source-link-interactive_g.cluster]:cursor-pointer \
[&.source-link-interactive_g.actor]:cursor-pointer \
[&.source-link-interactive_g.classGroup]:cursor-pointer \
[&.source-link-interactive_path.flowchart-link]:cursor-pointer \
[&.source-link-interactive_g.edgePath]:cursor-pointer \
[&_g.is-source-link-caret>*:first-child]:stroke-primary \
[&_g.is-source-link-caret>*:first-child]:stroke-[1.75] \
[&_g.is-mmd-selected>*:first-child]:stroke-primary \
[&_g.is-mmd-selected>*:first-child]:stroke-[1.75] \
[&_g.is-source-link-click>*:first-child]:stroke-primary \
[&_g.is-source-link-click>*:first-child]:stroke-[2.5] \
[&_g.is-source-link-click]:drop-shadow-[0_0_4px_color-mix(in_oklab,var(--primary)_45%,transparent)] \
[&_g.is-mmd-selected]:drop-shadow-[0_0_4px_color-mix(in_oklab,var(--primary)_45%,transparent)] \
[&_path.flowchart-link.is-source-link-caret]:stroke-primary [&_path.flowchart-link.is-source-link-caret]:stroke-2 \
[&_g.edgePath.is-source-link-caret>path.flowchart-link]:stroke-primary \
[&_g.edgePath.is-source-link-caret>path.flowchart-link]:stroke-2 \
[&_path.flowchart-link.is-source-link-click]:stroke-primary \
[&_path.flowchart-link.is-source-link-click]:stroke-3 \
[&_path.flowchart-link.is-source-link-click]:drop-shadow-[0_0_4px_color-mix(in_oklab,var(--primary)_45%,transparent)] \
[&_g.edgePath.is-source-link-click>path.flowchart-link]:stroke-primary \
[&_g.edgePath.is-source-link-click>path.flowchart-link]:stroke-3 \
[&_g.edgePath.is-source-link-click>path.flowchart-link]:drop-shadow-[0_0_4px_color-mix(in_oklab,var(--primary)_45%,transparent)] \
";
