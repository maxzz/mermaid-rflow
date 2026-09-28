/**
 * The water plane as the "Enter Labs" label sees it: CSS `perspective` on a box centered at (originX, originY)
 * with the label tilted back by `rotateX(tiltDeg)` around the same point. Shapes lying on the water are
 * projected with the same math so they share the label's perspective.
 */
export const SWAMP_SURFACE = {
    originX: 220,
    originY: 258,
    perspective: 120,
    tiltDeg: 62,
} as const;

const tilt = SWAMP_SURFACE.tiltDeg * Math.PI / 180;
const cos = Math.cos(tilt);
const sin = Math.sin(tilt);
const d = SWAMP_SURFACE.perspective;

type SurfacePoint = { u: number; v: number; };  // on the water plane; +v is toward the viewer
type ScreenPoint = { x: number; y: number; };   // in SWAMP_VIEW units

export function fromSurface(u: number, v: number): ScreenPoint {
    const k = d / (d - v * sin);
    return { x: SWAMP_SURFACE.originX + u * k, y: SWAMP_SURFACE.originY + v * cos * k };
}

export function toSurface(x: number, y: number): SurfacePoint {
    const dy = y - SWAMP_SURFACE.originY;
    const v = dy * d / (cos * d + dy * sin);
    return { u: (x - SWAMP_SURFACE.originX) * (d - v * sin) / d, v };
}

/** How much larger than at the origin things look at this screen point: closer is bigger. */
export function surfaceDepthScale(y: number) {
    return d / (d - toSurface(SWAMP_SURFACE.originX, y).v * sin);
}

/** A circle lying on the water, centered at a screen point. */
export function surfaceCirclePath(x: number, y: number, radius: number, segments = 48) {
    const { u, v } = toSurface(x, y);
    let path = "";
    for (let i = 0; i < segments; i++) {
        const angle = 2 * Math.PI * i / segments;
        const p = fromSurface(u + radius * Math.cos(angle), v + radius * Math.sin(angle));
        path += `${i ? "L" : "M"} ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
    }
    return `${path}Z`;
}
