export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

/** Drag from any corner. Width and height stay non-negative. */
export function markingRectFromDrag(startX: number, startY: number, x: number, y: number): Rect {
    return {
        x: Math.min(startX, x),
        y: Math.min(startY, y),
        width: Math.abs(x - startX),
        height: Math.abs(y - startY),
    };
}

/** True when the rectangles share area. Edge contact alone does not count. */
export function rectsIntersect(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.width
        && a.x + a.width > b.x
        && a.y < b.y + b.height
        && a.y + a.height > b.y;
}
