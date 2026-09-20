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
import { FlowDiagram, LoadDialog } from "@/features/rflow";
import { MermaidView } from "@/features/mmd";

export function PreviewPanel() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { zoom, outputFormat } = useSnapshot(mermaidSettings);
    const overflow = useViewportOverflow(scrollRef, [zoom]);
    const isFlow = outputFormat === 'flow';
    const isMmd = outputFormat === 'mmd';
    const flowMounted = useMountedOnce(isFlow);
    const mmdMounted = useMountedOnce(isMmd);

    return (
        <div className="h-full bg-muted/20 flex flex-col">
            <PreviewToolbar />

            <div className="relative flex-1 min-h-0">
                {flowMounted
                    ? (
                        <div className={previewPaneClass(isFlow)} aria-hidden={!isFlow} inert={!isFlow || undefined}>
                            <ErrorBoundary fallback={<PanelMessage>Failed to load the React Flow canvas.</PanelMessage>}>
                                <FlowDiagram active={isFlow} />
                            </ErrorBoundary>
                        </div>
                    )
                    : null}
                {mmdMounted
                    ? (
                        <div className={previewPaneClass(isMmd)} aria-hidden={!isMmd} inert={!isMmd || undefined}>
                            <ErrorBoundary fallback={<PanelMessage>Failed to load the official Mermaid renderer.</PanelMessage>}>
                                <MermaidView active={isMmd} />
                            </ErrorBoundary>
                        </div>
                    )
                    : null}
                {!isFlow && !isMmd
                    ? (
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
                    )
                    : null}
            </div>

            <StatusBar />
            <LoadDialog />
        </div>
    );
}

/** `display:none` makes React Flow report error 004 and leaves the Mermaid overlay with no hit targets. */
function previewPaneClass(active: boolean) {
    return classNames('absolute inset-0 overflow-hidden', !active && 'invisible pointer-events-none');
}

function useMountedOnce(active: boolean) {
    const [mounted, setMounted] = useState(active);
    if (active && !mounted) {
        setMounted(true);
    }
    return mounted;
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
