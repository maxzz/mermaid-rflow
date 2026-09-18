import { type CSSProperties, type PointerEvent, type RefObject, type WheelEvent, use, useEffect, useMemo, useRef } from "react";
import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";

import { mermaidSettings, setZoom, ZOOM_STEP } from "@/store/2-mermaid-settings";
import { publishPreviewStatus, renderDiagram, useDebouncedValue } from "@/store/5-render-diagram/5-render";
import { loadBeautifulMermaid } from "@/components/2-main/2-editor-page/1-panel-editor/8-lazy-modules";
import { usePreviewSourceLink } from "@/components/2-main/2-editor-page/3-source-diagram-link/2-diagram";
import { panModeAtom, PREVIEW_CONTENT_ATTR } from "./4-zoom-controls";
import { DiagramText } from "./7-diagram-text";

const RENDER_DEBOUNCE_MS = 300;

type RenderViewProps = {
    scrollRef: RefObject<HTMLDivElement | null>;
};

/** Suspends until beautiful-mermaid is loaded (see PreviewPanel Suspense boundary). */
export function RenderView({ scrollRef }: RenderViewProps) {
    const bm = use(loadBeautifulMermaid());

    const { source, outputFormat, zoom, diagramTheme, ascii, svg } = useSnapshot(mermaidSettings);
    const debouncedSource = useDebouncedValue(source, RENDER_DEBOUNCE_MS);

    // Synchronous, memoized render: no flash, only recomputed when inputs change
    const renderResult = useMemo(
        () => renderDiagram(bm, debouncedSource, { diagramTheme, ascii, svg }, outputFormat),
        [bm, debouncedSource, diagramTheme, ascii, svg, outputFormat],
    );

    useEffect(() => publishPreviewStatus(renderResult), [renderResult]);

    const panMode = useAtomValue(panModeAtom);
    const panHandlers = usePanToScroll(scrollRef, panMode);
    const hostRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    
    const svgEnabled = renderResult.format === "svg" && !!renderResult.output && !renderResult.error;

    usePreviewSourceLink({
        contentRef,
        hostRef,
        scrollRef,
        enabled: svgEnabled,
        output: svgEnabled ? renderResult.output : "",
        panMode,
    });

    function onWheel(e: WheelEvent<HTMLDivElement>) {
        if (!e.ctrlKey && !e.metaKey) {
            return;
        }
        e.preventDefault();
        setZoom(e.deltaY < 0 ? zoom * ZOOM_STEP : zoom / ZOOM_STEP);
    }

    const contentStyle: CSSProperties = { zoom };

    return (
        <div ref={hostRef} className={classNames("min-w-full min-h-full", panMode && "cursor-grab select-none")} onWheel={onWheel} {...panHandlers}>
            <div className="p-6 min-w-full min-h-full flex">
                {renderResult.error
                    ? (
                        <pre className="m-auto px-4 py-3 max-w-full text-xs font-code text-destructive bg-destructive/10 border border-destructive/30 rounded-md whitespace-pre-wrap">
                            {renderResult.error}
                        </pre>
                    )
                    : !renderResult.output
                        ? (
                            <div className="m-auto text-sm text-muted-foreground">
                                Start typing to render your diagram
                            </div>
                        )
                        : renderResult.format === 'svg'
                            ? (
                                <div
                                    ref={contentRef}
                                    className="m-auto [&>svg]:max-w-none [&>svg]:block"
                                    {...{ [PREVIEW_CONTENT_ATTR]: '' }}
                                    style={contentStyle}
                                    dangerouslySetInnerHTML={{ __html: renderResult.output }}
                                />
                            )
                            : (
                                <DiagramText
                                    className="m-auto"
                                    {...{ [PREVIEW_CONTENT_ATTR]: '' }}
                                    style={contentStyle}
                                    text={renderResult.output}
                                />
                            )
                }
            </div>
        </div>
    );
}

/** Drag-to-scroll when pan mode is on (or with the middle mouse button). */
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
