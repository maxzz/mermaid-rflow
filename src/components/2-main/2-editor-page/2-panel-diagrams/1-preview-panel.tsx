import { Suspense, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { mermaidSettings } from "@/store/2-mermaid-settings";
import { BarsLoaderIcon } from "@/ui/local-ui";
import { ErrorBoundary } from "@/ui/local-ui/8-error-boundary";
import { ScrollArea2 } from "@/ui/shadcn/scroll-area";
import { PreviewToolbar } from "./2-preview-toolbar";
import { RenderView } from "./3-render-view";
import { ZoomControls } from "./4-zoom-controls";
import { StatusBar } from "./5-status-bar";

export function PreviewPanel() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { zoom } = useSnapshot(mermaidSettings);
    const overflow = useViewportOverflow(scrollRef, [zoom]);

    return (
        <div className="h-full bg-muted/20 flex flex-col">
            <PreviewToolbar />

            <div className="relative flex-1 min-h-0">
                <div className="absolute inset-0 overflow-hidden">
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
                </div>
            </div>

            <StatusBar />
        </div>
    );
}

function PanelMessage({ children }: { children: React.ReactNode; }) {
    return (
        <div className="h-full text-xs text-muted-foreground flex items-center justify-center">
            {children}
        </div>
    );
}

function useViewportOverflow(ref: RefObject<HTMLElement | null>, deps: unknown[]) {
    const [overflow, setOverflow] = useState({ x: false, y: false });

    useLayoutEffect(
        () => {
            const el = ref.current;
            if (!el) {
                return;
            }

            const check = () => {
                setOverflow({
                    x: el.scrollWidth > el.clientWidth + 1,
                    y: el.scrollHeight > el.clientHeight + 1,
                });
            };

            check();
            const ro = new ResizeObserver(check);
            ro.observe(el);
            if (el.firstElementChild) {
                ro.observe(el.firstElementChild);
            }
            return () => ro.disconnect();
        },
        deps);

    return overflow;
}
