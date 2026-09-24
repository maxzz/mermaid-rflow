/** Screen pixels. Flow space divides by zoom so the gap, stroke, and handles keep these proportions. */
export const FRAME_OFFSET = 4;
export const FRAME_STROKE = 1.5;
export const HANDLE_SIZE = 8;
export const HANDLE_RADIUS = 2;

export type FlowBox = {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
};

export type Bounds = { x: number; y: number; w: number; h: number; };

export type Corner = 'nw' | 'ne' | 'sw' | 'se';

export function unionBounds(boxes: FlowBox[]): Bounds | null {
    if (boxes.length === 0) {
        return null;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const box of boxes) {
        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.w);
        maxY = Math.max(maxY, box.y + box.h);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Expands the selection by a constant screen-pixel gap. */
export function frameAround(bounds: Bounds, zoom: number): Bounds {
    const pad = FRAME_OFFSET / (zoom > 0 ? zoom : 1);
    return {
        x: bounds.x - pad,
        y: bounds.y - pad,
        w: bounds.w + pad * 2,
        h: bounds.h + pad * 2,
    };
}

export function oppositeCorner(bounds: Bounds, corner: Corner): { x: number; y: number; } {
    switch (corner) {
        case 'nw':
            return { x: bounds.x + bounds.w, y: bounds.y + bounds.h };
        case 'ne':
            return { x: bounds.x, y: bounds.y + bounds.h };
        case 'sw':
            return { x: bounds.x + bounds.w, y: bounds.y };
        default:
            return { x: bounds.x, y: bounds.y };
    }
}

function cornerPoint(bounds: Bounds, corner: Corner): { x: number; y: number; } {
    switch (corner) {
        case 'nw':
            return { x: bounds.x, y: bounds.y };
        case 'ne':
            return { x: bounds.x + bounds.w, y: bounds.y };
        case 'sw':
            return { x: bounds.x, y: bounds.y + bounds.h };
        default:
            return { x: bounds.x + bounds.w, y: bounds.y + bounds.h };
    }
}

/** Uniform scale of every box about the corner opposite the one being dragged. */
export function scaleFromCorner(start: FlowBox[], bounds: Bounds, corner: Corner, pointer: { x: number; y: number; }, min = 24): FlowBox[] {
    const anchor = oppositeCorner(bounds, corner);
    const origin = cornerPoint(bounds, corner);
    const base = Math.hypot(origin.x - anchor.x, origin.y - anchor.y) || 1;
    const next = Math.hypot(pointer.x - anchor.x, pointer.y - anchor.y);
    let scale = next / base;
    const smallest = Math.min(...start.map((box) => Math.min(box.w, box.h)));
    if (smallest > 0) {
        scale = Math.max(scale, min / smallest);
    }
    return start.map((box) => ({
        id: box.id,
        x: anchor.x + (box.x - anchor.x) * scale,
        y: anchor.y + (box.y - anchor.y) * scale,
        w: box.w * scale,
        h: box.h * scale,
    }));
}
