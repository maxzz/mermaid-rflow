import { Suspense, useRef } from "react";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { useViewportOverflow } from "@/utils/util-hooks/use-viewport-overflow";
import { ScrollArea2 } from "@/ui/shadcn/scroll-area";
import { BarsLoaderIcon } from "@/ui/local-ui";

import { PanelFallbackMessage } from "../../../../../../ui/local-ui/1-4-view-shared";
import { ErrorBoundary } from "@/ui/local-ui/8-error-boundary";

import { mermaidSettings, OutputFormat } from "@/store/2-mermaid-settings";
import { Body_Bm } from "./2-body-bm";
import { ZoomControls_Bm } from "../1-3-2-zoom-controls-bm";

export function Preview_Bm() {
    const { zoom, outputFormat } = useSnapshot(mermaidSettings);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const overflow = useViewportOverflow(scrollRef, [outputFormat, zoom]);

    if (outputFormat === OutputFormat.flow || outputFormat === OutputFormat.mmd) {
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
            <ErrorBoundary fallback={<PanelFallbackMessage>Failed to load the diagram renderer.</PanelFallbackMessage>}>
                <Suspense fallback={<PanelFallbackMessage><BarsLoaderIcon /></PanelFallbackMessage>}>
                    <Body_Bm scrollRef={scrollRef} />
                </Suspense>
            </ErrorBoundary>
        </ScrollArea2>

        <ZoomControls_Bm scrollRef={scrollRef} className="absolute left-4 bottom-4" />
    </>);
}
