import { type PointerEvent, type RefObject, useRef } from "react";

/** Drag-to-scroll when pan mode is on (or with the middle mouse button). */
export function usePanToScroll(scrollRef: RefObject<HTMLDivElement | null>, panMode: boolean) {
    const dragRef = useRef<{ x: number; y: number; left: number; top: number; } | null>(null);

    function onPointerDown(e: PointerEvent<HTMLDivElement>) {
        const el = scrollRef.current;
        const middleButton = e.button === 1;
        if (!el || (!panMode && !middleButton) || (e.button !== 0 && !middleButton)) {
            return;
        }
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        dragRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
        el.style.cursor = 'grabbing';
    }

    function onPointerMove(e: PointerEvent<HTMLDivElement>) {
        const el = scrollRef.current;
        const drag = dragRef.current;
        if (!el || !drag) {
            return;
        }
        el.scrollLeft = drag.left - (e.clientX - drag.x);
        el.scrollTop = drag.top - (e.clientY - drag.y);
    }

    function onPointerUp(e: PointerEvent<HTMLDivElement>) {
        const el = scrollRef.current;
        if (el && dragRef.current) {
            el.releasePointerCapture(e.pointerId);
            el.style.cursor = '';
        }
        dragRef.current = null;
    }

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}
