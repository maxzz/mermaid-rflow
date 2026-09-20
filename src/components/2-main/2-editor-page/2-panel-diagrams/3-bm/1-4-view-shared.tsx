import { useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import { classNames } from "@/utils";

/** Fill the preview pane. Size comes from the relative + absolute inset-0 parent, not from a scroller. */
export function canvasTabClass(active: boolean) {
    return classNames('absolute inset-0', !active && 'opacity-0 pointer-events-none');
}

export function useMountedOnce(active: boolean) {
    const [mounted, setMounted] = useState(active);
    if (active && !mounted) {
        setMounted(true);
    }
    return mounted;
}

export function PanelMessage({ children }: { children: ReactNode; }) {
    return (
        <div className="h-full text-xs text-muted-foreground flex items-center justify-center">
            {children}
        </div>
    );
}

export function useViewportOverflow(ref: RefObject<HTMLElement | null>, deps: unknown[]) {
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
