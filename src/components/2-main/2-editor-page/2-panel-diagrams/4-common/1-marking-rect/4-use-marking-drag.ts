import { useEffect, useRef } from 'react';
import { markingRectFromDrag, type Rect } from './1-geometry';
import { clearMarkingRect, setMarkingRect, type MarkingRectState } from './2-store';

const DRAG_THRESHOLD = 4;

type SurfaceRef = { readonly current: HTMLElement | null; };

export type MarkingDragOptions = {
    rect: MarkingRectState;
    surfaceRef: SurfaceRef;
    enabled: boolean;
    /** Return false to let the event through (a node, a control, a modifier that should pan). */
    shouldStart: (event: MouseEvent) => boolean;
    onStart?: () => void;
    onUpdate?: (rect: Rect) => void;
    onCommit?: (rect: Rect) => void;
    /** Pointer went down and up without crossing the drag threshold. */
    onClick?: () => void;
};

/**
 * Background drag that writes a marking rectangle into `rect`.
 * Callers decide which pointer starts a drag; this hook does not keep its own React state.
 */
export function useMarkingDrag({ rect, surfaceRef, enabled, shouldStart, onStart, onUpdate, onCommit, onClick }: MarkingDragOptions) {
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

    useEffect(() => {
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

        const onMouseDown = (event: MouseEvent) => {
            if (event.button !== 0 || !shouldStartRef.current(event)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            const point = localPoint(event);
            session = { startX: point.x, startY: point.y, dragging: false };
            onStartRef.current?.();
        };

        const onMouseMove = (event: MouseEvent) => {
            if (!session) {
                return;
            }
            const point = localPoint(event);
            const box = markingRectFromDrag(session.startX, session.startY, point.x, point.y);
            if (!session.dragging && box.width < DRAG_THRESHOLD && box.height < DRAG_THRESHOLD) {
                return;
            }
            session.dragging = true;
            setMarkingRect(rect, box);
            onUpdateRef.current?.(box);
        };

        const endSession = (event: MouseEvent) => {
            if (!session) {
                return;
            }
            const dragged = session.dragging;
            const point = localPoint(event);
            const box = markingRectFromDrag(session.startX, session.startY, point.x, point.y);
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
        };

        const onClickCapture = (event: MouseEvent) => {
            if (!suppressClick) {
                return;
            }
            suppressClick = false;
            event.preventDefault();
            event.stopPropagation();
        };

        const onBlur = () => {
            if (!session) {
                return;
            }
            session = null;
            clearMarkingRect(rect);
        };

        surface.addEventListener('mousedown', onMouseDown, true);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', endSession);
        window.addEventListener('click', onClickCapture, true);
        window.addEventListener('blur', onBlur);
        return () => {
            surface.removeEventListener('mousedown', onMouseDown, true);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', endSession);
            window.removeEventListener('click', onClickCapture, true);
            window.removeEventListener('blur', onBlur);
            clearMarkingRect(rect);
        };
    }, [enabled, rect, surfaceRef]);
}
