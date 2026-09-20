import { Suspense, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
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
    return (
        <div className="h-full bg-muted/20 flex flex-col">
            <PreviewToolbar />

            <div className="relative flex-1 min-h-0">
                <div className="absolute inset-0 overflow-hidden">
                    <Preview_Flow />
                    <Preview_Mermaid />
                    <Preview_BeautifullMarmaid />
                </div>
            </div>

            <StatusBar />
            <LoadDialog />
        </div>
    );
}

function Preview_Flow() {
    const { outputFormat } = useSnapshot(mermaidSettings);
    const active = outputFormat === 'flow';
    const mounted = useMountedOnce(active);
    if (!mounted) {
        return null;
    }

    return (
        <div className={canvasTabClass(active)} aria-hidden={!active} inert={!active || undefined}>
            <ErrorBoundary fallback={<PanelMessage>Failed to load the React Flow canvas.</PanelMessage>}>
                <FlowDiagram active={active} />
            </ErrorBoundary>
        </div>
    );
}

function Preview_Mermaid() {
    const { outputFormat } = useSnapshot(mermaidSettings);
    const active = outputFormat === 'mmd';
    const mounted = useMountedOnce(active);
    if (!mounted) {
        return null;
    }

    return (
        <div className={canvasTabClass(active)} aria-hidden={!active} inert={!active || undefined}>
            <ErrorBoundary fallback={<PanelMessage>Failed to load the official Mermaid renderer.</PanelMessage>}>
                <MermaidView active={active} />
            </ErrorBoundary>
        </div>
    );
}

function Preview_BeautifullMarmaid() {
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

/** Fill the preview pane. Size comes from the relative + absolute inset-0 parent, not from a scroller. */
function canvasTabClass(active: boolean) {
    return classNames('absolute inset-0', !active && 'opacity-0 pointer-events-none');
}

function useMountedOnce(active: boolean) {
    const [mounted, setMounted] = useState(active);
    if (active && !mounted) {
        setMounted(true);
    }
    return mounted;
}

function PanelMessage({ children }: { children: ReactNode; }) {
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
