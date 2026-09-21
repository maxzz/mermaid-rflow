import { type PointerEvent, type RefObject, useRef } from 'react';
import { getDefaultStore } from 'jotai';
import { mmdSettings } from '../8-store/2-mmd-settings';
import { mmdPanAtom } from '../8-store/3-mmd-ui';
import { setMmdPan } from './8-3-mmd-zoom';

export function usePanToTranslate(boardRef: RefObject<HTMLDivElement | null>, panMode: boolean) {
    const dragRef = useRef<{
        x: number;
        y: number;
        panX: number;
        panY: number;
        pointerId: number;
        curX: number;
        curY: number;
    } | null>(null);

    function onPointerDown(e: PointerEvent<HTMLDivElement>) {
        const middleButton = e.button === 1;
        if (e.button !== 0 && !middleButton) {
            return;
        }
        if (!panMode && !middleButton && e.target instanceof Element
            && e.target.closest('[data-mmd-hit], [data-mmd-chrome], [data-mmd-edge], g.node')) {
            return;
        }
        e.preventDefault();
        mmdSettings.autofit = false;
        const pan = getDefaultStore().get(mmdPanAtom);
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        }
        catch {
            // window path below still works if capture is unavailable
        }
        dragRef.current = {
            x: e.clientX,
            y: e.clientY,
            panX: pan.x,
            panY: pan.y,
            pointerId: e.pointerId,
            curX: pan.x,
            curY: pan.y,
        };
        e.currentTarget.style.cursor = 'grabbing';
    }

    function onPointerMove(e: PointerEvent<HTMLDivElement>) {
        const drag = dragRef.current;
        const board = boardRef.current;
        if (!drag || e.pointerId !== drag.pointerId) {
            return;
        }
        const x = drag.panX + (e.clientX - drag.x);
        const y = drag.panY + (e.clientY - drag.y);
        drag.curX = x;
        drag.curY = y;
        if (board) {
            board.style.transform = `translate(${x}px, ${y}px)`;
        }
    }

    function onPointerUp(e: PointerEvent<HTMLDivElement>) {
        const drag = dragRef.current;
        if (!drag || e.pointerId !== drag.pointerId) {
            return;
        }
        setMmdPan({ x: drag.curX, y: drag.curY });
        try {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        }
        catch {
            // ignore
        }
        e.currentTarget.style.cursor = '';
        dragRef.current = null;
    }

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}
