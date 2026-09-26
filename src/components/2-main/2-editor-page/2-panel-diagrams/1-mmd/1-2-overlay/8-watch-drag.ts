export function watchDrag(move: (ev: PointerEvent | MouseEvent) => void, up: (ev: PointerEvent | MouseEvent) => void) {
    let done = false;
    let sawPointerMove = false;

    function onMove(ev: PointerEvent | MouseEvent) {
        if (ev.type === 'pointermove') {
            sawPointerMove = true;
        }
        else if (sawPointerMove) {
            return;
        }
        move(ev);
    }

    function onUp(ev: PointerEvent | MouseEvent) {
        if (done) {
            return;
        }
        if (ev.type === 'mouseup' && sawPointerMove) {
            return;
        }
        done = true;

        abortController.abort();
        up(ev);
    }

    const abortController = new AbortController();
    window.addEventListener('pointermove', onMove, { signal: abortController.signal });
    window.addEventListener('pointerup', onUp, { signal: abortController.signal });
    window.addEventListener('pointercancel', onUp, { signal: abortController.signal });
    window.addEventListener('mousemove', onMove, { signal: abortController.signal });
    window.addEventListener('mouseup', onUp, { signal: abortController.signal });
}
