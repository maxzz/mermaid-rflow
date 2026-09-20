import { Suspense, useRef } from "react";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { mermaidSettings } from "@/store/2-mermaid-settings";
import { BarsLoaderIcon } from "@/ui/local-ui";
import { ErrorBoundary } from "@/ui/local-ui/8-error-boundary";
import { ScrollArea2 } from "@/ui/shadcn/scroll-area";
import { RenderView } from "./1-3-1-render-view";
import { ZoomControls } from "./1-3-2-zoom-controls";
import { PanelMessage, useViewportOverflow } from "./1-4-view-shared";

export function Preview_BeautifullMarmaid() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { zoom, outputFormat } = useSnapshot(mermaidSettings);
    const overflow = useViewportOverflow(scrollRef, [outputFormat, zoom]);

    if (outputFormat === 'flow' || outputFormat === 'mmd') {
        return null;
    }

    return (<>
        <ScrollArea2
            ref={scrollRef}
            className={classNames(
                "h-full [&_[data-radix-scroll-area-viewport]>div]:min-h-full",
                !overflow.y && "*:data-[orientation=vertical]:hidden",
                !overflow.x && "*:data-[orientation=horizontal]:hidden",
            )}
            horizontal
            type="always"
        >
            <ErrorBoundary fallback={<PanelMessage>Failed to load the diagram renderer.</PanelMessage>}>
                <Suspense fallback={<PanelMessage><BarsLoaderIcon /></PanelMessage>}>
                    <RenderView scrollRef={scrollRef} />
                </Suspense>
            </ErrorBoundary>
        </ScrollArea2>

        <ZoomControls scrollRef={scrollRef} className="absolute left-4 bottom-4" />
    </>);
}
