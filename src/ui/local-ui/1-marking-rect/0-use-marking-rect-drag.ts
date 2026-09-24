import { useEffect, useRef } from 'react';
import { type MarkingRectState, type Rect } from './9-types';
import { rectFromDrag } from './9-types';
import { clearMarkingRect, setMarkingRect } from './a-store-marking';

type MarkingRectDragOptions = {
    rect: MarkingRectState;
    surfaceRef: SurfaceRef;
    enabled: boolean;
    
    shouldStart: (event: MouseEvent) => boolean; // Return false to let the event through (a node, a control, a modifier that should pan).
    onStart?: (event: MouseEvent) => void; // Pointer went down. The modifier keys here decide how the drag applies.
    onUpdate?: (rect: Rect) => void;
    onCommit?: (rect: Rect) => void;
    onClick?: () => void; // Pointer went down and up without crossing the drag threshold.
};

type SurfaceRef = { readonly current: HTMLElement | null; };

/**
 * Background drag that writes a marking rectangle into `rect`.
 * Callers decide which pointer starts a drag; this hook does not keep its own React state.
 * Holding Space shows an open hand and does not start a selection. Pressing the mouse closes it; releasing either one steps the cursor back.
 */
export function useMarkingRectDrag({ rect, surfaceRef, enabled, shouldStart, onStart, onUpdate, onCommit, onClick }: MarkingRectDragOptions): void {
    const shouldStartRef = useRef(shouldStart);
    const onStartRef = useRef(onStart);
    const onUpdateRef = useRef(onUpdate);
    const onCommitRef = useRef(onCommit);
    const onClickRef = useRef(onClick);
    const spaceDown = useRef(false);
    const pointerDown = useRef(false);

    shouldStartRef.current = shouldStart;
    onStartRef.current = onStart;
    onUpdateRef.current = onUpdate;
    onCommitRef.current = onCommit;
    onClickRef.current = onClick;

    useEffect(
        () => {
            function syncCursor() {
                applyPanCursor(surfaceRef.current, spaceDown.current, pointerDown.current);
            }
            function down(event: KeyboardEvent) {
                if (event.code !== 'Space' || event.repeat || isEditableTarget(event.target)) {
                    return;
                }
                spaceDown.current = true;
                syncCursor();
            }
            function up(event: KeyboardEvent) {
                if (event.code === 'Space') {
                    clearSpace();
                }
            }
            function clearSpace() {
                spaceDown.current = false;
                pointerDown.current = false;
                syncCursor();
            }
            function onMouseDown(event: MouseEvent) {
                if (event.button !== 0 || !spaceDown.current) {
                    return;
                }
                const surface = surfaceRef.current;
                if (!surface || !(event.target instanceof Node) || !surface.contains(event.target)) {
                    return;
                }
                pointerDown.current = true;
                syncCursor();
            }
            function onMouseUp(event: MouseEvent) {
                if (event.button !== 0 || !pointerDown.current) {
                    return;
                }
                pointerDown.current = false;
                syncCursor();
            }

            const abortController = new AbortController();
            window.addEventListener('keydown', down, { signal: abortController.signal });
            window.addEventListener('keyup', up, { signal: abortController.signal });
            window.addEventListener('blur', clearSpace, { signal: abortController.signal });
            window.addEventListener('mousedown', onMouseDown, { capture: true, signal: abortController.signal });
            // Capture runs before the pan gesture, which stops the mouseup from reaching a bubble listener.
            window.addEventListener('mouseup', onMouseUp, { capture: true, signal: abortController.signal });

            return () => {
                abortController.abort();
                clearSpace();
            };
        },
        [surfaceRef]);

    useEffect(
        () => {
            const surface = surfaceRef.current;
            if (!enabled || !surface) {
                return;
            }
            // A pan rewrites the pane className and drops the pointer, leaving the library grab cursor.
            const apply = () => {
                const pane = surface.querySelector('.react-flow__pane');
                if (pane instanceof HTMLElement && !pane.classList.contains(POINTER_CURSOR)) {
                    pane.classList.add(POINTER_CURSOR);
                }
            };
            apply();
            const observer = new MutationObserver(apply);
            observer.observe(surface, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
            return () => {
                observer.disconnect();
                surface.querySelector('.react-flow__pane')?.classList.remove(POINTER_CURSOR);
            };
        },
        [enabled, surfaceRef]);

    useEffect(
        () => {
            const surface = surfaceRef.current;
            if (!enabled || !surface) {
                clearMarkingRect(rect);
                return;
            }

            let session: { startX: number; startY: number; dragging: boolean; } | null = null;
            let suppressClick = false;
            let suppressTimer = 0;

            const localPoint = (event: MouseEvent) => {
                const bounds = surface.getBoundingClientRect();
                return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
            };

            function onMouseDown(event: MouseEvent) {
                if (event.button !== 0 || spaceDown.current || !shouldStartRef.current(event)) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                const point = localPoint(event);
                session = { startX: point.x, startY: point.y, dragging: false };
                onStartRef.current?.(event);
            }

            function onMouseMove(event: MouseEvent) {
                if (!session) {
                    return;
                }
                const point = localPoint(event);
                const box = rectFromDrag(session.startX, session.startY, point.x, point.y);
                if (!session.dragging && box.width < DRAG_THRESHOLD && box.height < DRAG_THRESHOLD) {
                    return;
                }
                session.dragging = true;
                setMarkingRect(rect, box);
                onUpdateRef.current?.(box);
            }

            function endSession(event: MouseEvent) {
                if (!session) {
                    return;
                }
                const dragged = session.dragging;
                const point = localPoint(event);
                const box = rectFromDrag(session.startX, session.startY, point.x, point.y);
                session = null;
                clearMarkingRect(rect);
                if (dragged) {
                    // The click that follows mouseup would clear the pane selection, or keep only the block under the pointer.
                    // A microtask runs before that click; a timeout runs after it.
                    suppressClick = true;
                    window.clearTimeout(suppressTimer);
                    suppressTimer = window.setTimeout(() => {
                        suppressClick = false;
                    }, 0);
                    onCommitRef.current?.(box);
                    return;
                }
                onClickRef.current?.();
            }

            function onClickCapture(event: MouseEvent) {
                if (!suppressClick) {
                    return;
                }
                suppressClick = false;
                window.clearTimeout(suppressTimer);
                event.preventDefault();
                event.stopPropagation();
            }

            function onBlur() {
                if (!session) {
                    return;
                }
                session = null;
                clearMarkingRect(rect);
            }

            const controller = new AbortController();
            const { signal } = controller;
            surface.addEventListener('mousedown', onMouseDown, { capture: true, signal });
            window.addEventListener('mousemove', onMouseMove, { signal });
            window.addEventListener('mouseup', endSession, { signal });
            window.addEventListener('click', onClickCapture, { capture: true, signal });
            window.addEventListener('blur', onBlur, { signal });

            return () => {
                controller.abort();
                window.clearTimeout(suppressTimer);
                clearMarkingRect(rect);
            };
        },
        [enabled, rect, surfaceRef]);
}

const DRAG_THRESHOLD = 4;

const POINTER_CURSOR = 'cursor-default!';

/** Open hand while Space is held. Closed hand only while the mouse button is also down. */
const GRAB_CURSOR = ['cursor-grab!', '[&_:not(button):not(a)]:cursor-grab!'] as const;
const GRABBING_CURSOR = ['cursor-grabbing!', '[&_:not(button):not(a)]:cursor-grabbing!'] as const;

function applyPanCursor(surface: HTMLElement | null, space: boolean, pressed: boolean) {
    setCursorClasses(surface, GRAB_CURSOR, space && !pressed);
    setCursorClasses(surface, GRABBING_CURSOR, space && pressed);
}

function setCursorClasses(surface: HTMLElement | null, classes: readonly string[], on: boolean) {
    if (!surface) {
        return;
    }
    for (const className of classes) {
        surface.classList.toggle(className, on);
    }
}

function isEditableTarget(target: EventTarget | null) {
    return target instanceof HTMLElement && (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
    );
}
