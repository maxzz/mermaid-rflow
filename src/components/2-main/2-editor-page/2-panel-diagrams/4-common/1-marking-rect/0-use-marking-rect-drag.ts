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
 */
export function useMarkingRectDrag({ rect, surfaceRef, enabled, shouldStart, onStart, onUpdate, onCommit, onClick }: MarkingRectDragOptions): void {
    const shouldStartRef = useRef(shouldStart);
    const onStartRef = useRef(onStart);
    const onUpdateRef = useRef(onUpdate);
    const onCommitRef = useRef(onCommit);
    const onClickRef = useRef(onClick);

    shouldStartRef.current = shouldStart;
    onStartRef.current = onStart;
    onUpdateRef.current = onUpdate;
    onCommitRef.current = onCommit;
    onClickRef.current = onClick;

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
                if (event.button !== 0 || !shouldStartRef.current(event)) {
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
