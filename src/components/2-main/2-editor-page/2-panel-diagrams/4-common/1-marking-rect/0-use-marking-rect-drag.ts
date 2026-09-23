import { useEffect, useRef } from 'react';
import { type MarkingRectState, type Rect } from './9-types';
import { rectFromDrag } from './9-types';
import { clearMarkingRect, setMarkingRect } from './a-store-marking';

type MarkingRectDragOptions = {
    rect: MarkingRectState;
    surfaceRef: SurfaceRef;
    enabled: boolean;
    
    shouldStart: (event: MouseEvent) => boolean; // Return false to let the event through (a node, a control, a modifier that should pan).
    onStart?: () => void;
    onUpdate?: (rect: Rect) => void;
    onCommit?: (rect: Rect) => void;
    onClick?: () => void; // Pointer went down and up without crossing the drag threshold.
};

type SurfaceRef = { readonly current: HTMLElement | null; };

/**
 * Background drag that writes a marking rectangle into `rect`.
 * Callers decide which pointer starts a drag; this hook does not keep its own React state.
 * Holding Space shows a grabbing cursor and does not start a selection, so every canvas can pan the same way.
 */
export function useMarkingRectDrag({ rect, surfaceRef, enabled, shouldStart, onStart, onUpdate, onCommit, onClick }: MarkingRectDragOptions): void {
    const shouldStartRef = useRef(shouldStart);
    const onStartRef = useRef(onStart);
    const onUpdateRef = useRef(onUpdate);
    const onCommitRef = useRef(onCommit);
    const onClickRef = useRef(onClick);
    const spaceDown = useRef(false);

    shouldStartRef.current = shouldStart;
    onStartRef.current = onStart;
    onUpdateRef.current = onUpdate;
    onCommitRef.current = onCommit;
    onClickRef.current = onClick;

    useEffect(
        () => {
            function down(event: KeyboardEvent) {
                if (event.code !== 'Space' || event.repeat || isEditableTarget(event.target)) {
                    return;
                }
                spaceDown.current = true;
                setSpacePanCursor(surfaceRef.current, true);
            }
            function up(event: KeyboardEvent) {
                if (event.code === 'Space') {
                    clearSpace();
                }
            }
            function clearSpace() {
                spaceDown.current = false;
                setSpacePanCursor(surfaceRef.current, false);
            }

            const abortController = new AbortController();
            window.addEventListener('keydown', down, { signal: abortController.signal });
            window.addEventListener('keyup', up, { signal: abortController.signal });
            window.addEventListener('blur', clearSpace, { signal: abortController.signal });

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
                clearMarkingRect(rect);
                return;
            }

            let session: { startX: number; startY: number; dragging: boolean; } | null = null;
            let suppressClick = false;

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
                onStartRef.current?.();
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
                    suppressClick = true;
                    queueMicrotask(() => {
                        suppressClick = false;
                    });
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
                clearMarkingRect(rect);
            };
        },
        [enabled, rect, surfaceRef]);
}

const DRAG_THRESHOLD = 4;

/** Closed hand on the surface and its contents. Buttons and links keep their own cursor. */
const SPACE_PAN_CURSOR = ['cursor-grabbing!', '[&_:not(button):not(a)]:cursor-grabbing!'] as const;

function setSpacePanCursor(surface: HTMLElement | null, on: boolean) {
    if (!surface) {
        return;
    }
    for (const className of SPACE_PAN_CURSOR) {
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
