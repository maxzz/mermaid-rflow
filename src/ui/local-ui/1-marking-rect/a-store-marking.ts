import { proxy } from 'valtio';
import { type MarkingRectState, type Rect } from './9-types';

/** One rectangle state for the canvas. Each view creates its own with `createMarkingRect`. */
export function createMarkingRect(): MarkingRectState {
    return proxy<MarkingRectState>({
        active: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    });
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
