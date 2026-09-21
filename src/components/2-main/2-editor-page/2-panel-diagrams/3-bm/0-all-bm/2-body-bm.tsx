import { type RefObject, type WheelEvent, use, useEffect, useMemo, useRef } from "react";
import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";

import { mermaidSettings, OutputFormat, setZoom, ZOOM_STEP } from "@/store/2-mermaid-settings";
import { publishPreviewStatus, renderDiagram } from "@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/5-render-diagram/5-render";
import { loadBeautifulMermaid } from "@/components/2-main/2-editor-page/1-panel-editor/8-lazy-modules";
import { useDebouncedValue } from "@/utils/util-hooks/use-debounced-value";
import { usePreviewSourceLink } from "../5-2-source-diagram-link-diagram";
import { panModeAtom, PREVIEW_CONTENT_ATTR } from "../1-3-2-zoom-controls-bm";
import { DiagramText } from "../7-diagram-text";
import { usePanToScroll } from "./use-pan-to-scroll";

const RENDER_DEBOUNCE_MS = 300;

type RenderViewProps = {
    scrollRef: RefObject<HTMLDivElement | null>;
};

/** Suspends until beautiful-mermaid is loaded (see PreviewPanel Suspense boundary). */
export function Body_Bm({ scrollRef }: RenderViewProps) {
    const bm = use(loadBeautifulMermaid());

    const { source, outputFormat, zoom, diagramTheme, ascii, svg } = useSnapshot(mermaidSettings);
    const debouncedSourceText = useDebouncedValue(source, RENDER_DEBOUNCE_MS);

    // Synchronous, memoized render: no flash, only recomputed when inputs change
    const bmFormat = outputFormat === OutputFormat.text ? OutputFormat.text : OutputFormat.svg;
    const renderResult = useMemo(
        () => renderDiagram(bm, debouncedSourceText, { diagramTheme, ascii, svg }, bmFormat),
        [bm, debouncedSourceText, diagramTheme, ascii, svg, bmFormat]);

    useEffect(
        () => publishPreviewStatus(renderResult),
        [renderResult]);

    const hostRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    
    const panMode = useAtomValue(panModeAtom);
    const panHandlers = usePanToScroll(scrollRef, panMode);

    const svgEnabled = renderResult.format === OutputFormat.svg && !!renderResult.output && !renderResult.error;

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

    return (
        <div ref={hostRef} className={classNames("min-w-full min-h-full", panMode && "cursor-grab select-none")} onWheel={onWheel} {...panHandlers}>
            <div className="p-6 min-w-full min-h-full flex">
                {renderResult.error
                    ? <BodyBm_Error error={renderResult.error} />
                    : !renderResult.output
                        ? <BodyBm_Empty />
                        : renderResult.format === OutputFormat.svg
                            ? <BodyBm_Svg contentRef={contentRef} output={renderResult.output} />
                            : <BodyBm_Text output={renderResult.output} />}
            </div>
        </div>
    );
}

//---------------------------------------------------------------------------
// Body components

function BodyBm_Svg({ contentRef, output }: { contentRef: RefObject<HTMLDivElement | null>; output: string; }) {
    const { zoom } = useSnapshot(mermaidSettings);

    return (
        <div
            ref={contentRef}
            className="m-auto [&>svg]:max-w-none [&>svg]:block"
            {...{ [PREVIEW_CONTENT_ATTR]: "" }}
            style={{ zoom }}
            dangerouslySetInnerHTML={{ __html: output }}
        />
    );
}

function BodyBm_Text({ output }: { output: string; }) {
    const { zoom } = useSnapshot(mermaidSettings);

    return (
        <DiagramText
            className="m-auto"
            {...{ [PREVIEW_CONTENT_ATTR]: "" }}
            style={{ zoom }}
            text={output}
        />
    );
}

function BodyBm_Error({ error }: { error: string; }) {
    return (
        <pre className="m-auto px-4 py-3 max-w-full text-xs font-code text-destructive bg-destructive/10 border border-destructive/30 rounded-md whitespace-pre-wrap">
            {error}
        </pre>
    );
}

function BodyBm_Empty() {
    return (
        <div className="m-auto text-sm text-muted-foreground">
            Start typing to render your diagram
        </div>
    );
}
