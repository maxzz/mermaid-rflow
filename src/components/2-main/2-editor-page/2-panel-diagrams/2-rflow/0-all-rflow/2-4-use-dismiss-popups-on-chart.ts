import { type RefObject, useEffect } from 'react';

/**
 * Popups close on a click outside their content. Radix waits for that click, then
 * ignores it when an earlier `mousedown` or `touchstart` never bubbles — which the
 * chart does on purpose (marquee capture, and d3 drag/zoom on nodes and the pane).
 * A press anywhere else on the page still bubbles, so the same popup does close.
 * Replay a bubbling click before the chart swallows the real press.
 */
const openPopupSelector = [
    '[data-slot="popover-content"][data-state="open"]',
    '[data-slot="dropdown-menu-content"][data-state="open"]',
    '[data-slot="dropdown-menu-sub-content"][data-state="open"]',
    '[data-slot="context-menu-content"][data-state="open"]',
    '[data-slot="context-menu-sub-content"][data-state="open"]',
    '[data-slot="menubar-content"][data-state="open"]',
    '[data-slot="menubar-sub-content"][data-state="open"]',
    '[data-slot="select-content"][data-state="open"]',
].join(', ');

export function useDismissPopupsOnChart(surfaceRef: RefObject<HTMLElement | null>) {
    useEffect(
        () => {
            const surface = surfaceRef.current;
            if (!surface) {
                return;
            }

            function onMouseDown(event: MouseEvent) {
                if (event.button !== 0 || !chartPressShouldDismiss(surface, event.target)) {
                    return;
                }
                dismissOpenPopup(event.clientX, event.clientY);
            }

            function onTouchStart(event: TouchEvent) {
                const touch = event.touches[0];
                if (!touch || !chartPressShouldDismiss(surface, event.target)) {
                    return;
                }
                dismissOpenPopup(touch.clientX, touch.clientY);
            }

            const abortController = new AbortController();
            const options = { capture: true, signal: abortController.signal };
            window.addEventListener('mousedown', onMouseDown, options);
            window.addEventListener('touchstart', onTouchStart, options);
            return () => abortController.abort();
        },
        [surfaceRef]);
}

function chartPressShouldDismiss(surface: HTMLElement | null, target: EventTarget | null) {
    if (!surface || !(target instanceof Node) || !surface.contains(target)) {
        return false;
    }
    const element = target instanceof Element ? target : target.parentElement;
    if (!element || element.closest(openPopupSelector)) {
        return false;
    }
    return document.querySelector(openPopupSelector) !== null;
}

function dismissOpenPopup(clientX: number, clientY: number) {
    document.documentElement.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX,
        clientY,
    }));
}
