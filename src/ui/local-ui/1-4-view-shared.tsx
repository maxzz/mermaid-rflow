import { type ReactNode } from "react";
import { classNames } from "@/utils";

/** Fill the preview pane. Size comes from the relative + absolute inset-0 parent, not from a scroller. */
export function canvasTabClass(active: boolean) {
    return classNames('absolute inset-0', !active && 'opacity-0 pointer-events-none');
}

export function PanelFallbackMessage({ children }: { children: ReactNode; }) {
    return (
        <div className="h-full text-xs text-muted-foreground flex items-center justify-center">
            {children}
        </div>
    );
}
