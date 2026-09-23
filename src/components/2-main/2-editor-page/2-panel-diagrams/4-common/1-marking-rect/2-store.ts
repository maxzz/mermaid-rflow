import { proxy } from 'valtio';
import { type Rect } from './1-geometry';

/**
 * Screen-space box for one marking gesture.
 * Valtio fits this better than an atom: x/y/width change on every pointer move,
 * and only the overlay that reads them needs to render.
 */
export type MarkingRectState = Rect & {
    active: boolean;
};

export function createMarkingRect(): MarkingRectState {
    return proxy<MarkingRectState>({ active: false, x: 0, y: 0, width: 0, height: 0 });
}

export function setMarkingRect(state: MarkingRectState, next: Rect) {
    state.active = true;
    state.x = next.x;
    state.y = next.y;
    state.width = next.width;
    state.height = next.height;
}

export function clearMarkingRect(state: MarkingRectState) {
    state.active = false;
    state.x = 0;
    state.y = 0;
    state.width = 0;
    state.height = 0;
}
