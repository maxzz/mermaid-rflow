import { type ComponentProps, type ReactNode } from "react";
import { MaximizeIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { classNames } from "@/utils";
import { ZOOM_MAX, ZOOM_MIN } from "@/store/2-mermaid-settings";
import { Button } from "@/ui/shadcn/button";

export type ZoomBarProps = ComponentProps<"div"> & {
    zoom: number;
    min?: number;
    max?: number;
    onZoomOut: () => void;
    onZoomIn: () => void;
    onResetZoom: () => void;
    onFit: () => void;
    fitActive?: boolean;
    fitTitle?: string;
};

export function ZoomBar({ zoom, min = ZOOM_MIN, max = ZOOM_MAX, onZoomOut, onZoomIn, onResetZoom, onFit, fitActive, fitTitle, className, children, ...rest }: ZoomBarProps) {
    return (
        <div className={classNames(zoomBarFrameClass, className)} role="toolbar" aria-label="View controls" {...rest}>

            <Button variant="ghost" size="icon-xs" onClick={onZoomOut} disabled={zoom <= min} title="Zoom out">
                <ZoomOutIcon />
            </Button>

            <button
                className="min-w-10 font-mono tabular-nums text-[.7rem] text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={onResetZoom}
                title="Reset zoom to 100%"
                type="button"
            >
                {Math.round(zoom * 100)}%
            </button>

            <Button variant="ghost" size="icon-xs" onClick={onZoomIn} disabled={zoom >= max} title="Zoom in">
                <ZoomInIcon />
            </Button>

            <Button
                className={classNames(fitActive && "bg-muted text-foreground")}
                variant="ghost"
                size="icon-xs"
                onClick={onFit}
                title={fitTitle ?? (fitActive ? "Fit (autofit on)" : "Fit to view")}
                aria-pressed={fitActive || undefined}
            >
                <MaximizeIcon />
            </Button>

            {children}
        </div>
    );
}

export function ZoomBarToggle({ pressed, title, onClick, children }: { pressed: boolean; title: string; onClick: () => void; children: ReactNode; }) {
    return (
        <Button
            className={classNames(pressed && "bg-muted text-foreground")}
            variant="ghost"
            size="icon-xs"
            onClick={onClick}
            title={title}
            aria-pressed={pressed}
        >
            {children}
        </Button>
    );
}

/** Shared overlay slot for every diagram tab. */
export const zoomBarPositionClass = "absolute left-4 bottom-4 z-20";

const zoomBarFrameClass = "\
px-1 py-0.5 \
text-xs \
bg-background/90 backdrop-blur-sm \
border border-border \
rounded-lg \
shadow-sm \
flex items-center gap-0.5 \
";
