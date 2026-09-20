import { useLayoutEffect, useState, type RefObject } from "react";

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
