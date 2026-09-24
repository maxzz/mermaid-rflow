/**
 * Screen-space box for one marking gesture.
 * Valtio fits this better than an atom: x/y/width change on every pointer move,
 * and only the overlay that reads them needs to render.
 */
export type MarkingRectState = Rect & {
    active: boolean;
};

export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

//---------------------------------------------------------------------------
// Geometry helpers.

/** Drag from any corner. Width and height stay non-negative. */
export function rectFromDrag(startX: number, startY: number, x: number, y: number): Rect {
    return {
        x: Math.min(startX, x),
        y: Math.min(startY, y),
        width: Math.abs(x - startX),
        height: Math.abs(y - startY),
    };
}

/** True when the rectangles share area. Edge contact alone does not count. */
export function rectsIntersect(a: Rect, b: Rect): boolean {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

/** True when `inner` lies completely inside `outer`, including a shared edge. */
export function rectContains(outer: Rect, inner: Rect): boolean {
    return (
        inner.x >= outer.x &&
        inner.y >= outer.y &&
        inner.x + inner.width <= outer.x + outer.width &&
        inner.y + inner.height <= outer.y + outer.height
    );
}
