import { type ComponentProps, type RefObject } from "react";
import { atom, useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { HandIcon, MaximizeIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";

import { mermaidSettings, setZoom, zoomIn, zoomOut, ZOOM_MAX, ZOOM_MIN } from "@/store/2-mermaid-settings";

export function ZoomControls({ scrollRef, className, ...rest }: ComponentProps<'div'> & { scrollRef: RefObject<HTMLDivElement | null> }) {
    const { zoom } = useSnapshot(mermaidSettings);
    const [panMode, setPanMode] = useAtom(panModeAtom);

    function fitToView() {
        const container = scrollRef.current;
        const content = container?.querySelector<HTMLElement>(`[${PREVIEW_CONTENT_ATTR}]`);
        if (!container || !content) {
            setZoom(1);
            return;
        }

        // Content is scaled with CSS zoom; offsetWidth/Height report the unzoomed layout size
        // (unlike getBoundingClientRect, whose zoom handling differs between browser versions)
        const naturalW = content.offsetWidth;
        const naturalH = content.offsetHeight;
        if (naturalW <= 0 || naturalH <= 0) {
            setZoom(1);
            return;
        }

        const padding = 56; // scroll area p-6 (2 x 24px) + a small margin
        const fit = Math.min((container.clientWidth - padding) / naturalW, (container.clientHeight - padding) / naturalH);
        setZoom(fit);
    }

    return (
        <div className={classNames("px-1 py-0.5 text-xs bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-sm flex items-center gap-0.5", className)} {...rest}>
            <Button variant="ghost" size="icon-xs" onClick={zoomOut} disabled={zoom <= ZOOM_MIN} title="Zoom out">
                <ZoomOutIcon />
            </Button>

            <button
                className="min-w-10 font-mono tabular-nums text-[.7rem] text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setZoom(1)}
                title="Reset zoom to 100%"
                type="button"
            >
                {Math.round(zoom * 100)}%
            </button>

            <Button variant="ghost" size="icon-xs" onClick={zoomIn} disabled={zoom >= ZOOM_MAX} title="Zoom in">
                <ZoomInIcon />
            </Button>

            <Button variant="ghost" size="icon-xs" onClick={fitToView} title="Fit to view">
                <MaximizeIcon />
            </Button>

            <Button
                className={classNames(panMode && "bg-muted text-foreground")}
                variant="ghost"
                size="icon-xs"
                onClick={() => setPanMode((v) => !v)}
                title={panMode ? "Pan mode on: drag to scroll" : "Pan mode: drag to scroll"}
                aria-pressed={panMode}
            >
                <HandIcon />
            </Button>
        </div>
    );
}

/** Pan mode: drag the preview to scroll. Transient UI state. */
export const panModeAtom = atom(false);

/** Marker attribute on the zoomed preview content, used by fit-to-view. */
export const PREVIEW_CONTENT_ATTR = 'data-preview-content';
