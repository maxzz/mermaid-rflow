/**
 * Drag affordances for the Mermaid canvas, matching the mermaid.ai visual editor:
 * a dashed orthogonal preview of each connection, and solid guides where the
 * dragged block lines up with its neighbors.
 */

export type GuideBox = { x: number; y: number; w: number; h: number };
export type GuidePoint = { x: number; y: number };
export type AlignGuide = { x1: number; y1: number; x2: number; y2: number };

export const MMD_ALIGN_SNAP = 6;

const STRAIGHT = 1.5;
const STUB = 18;
const GUIDE_PAD = 12;

type Side = 'top' | 'right' | 'bottom' | 'left';

export function orthogonalRoute(from: GuideBox, to: GuideBox): GuidePoint[] {
    const dx = center(to).x - center(from).x;
    const dy = center(to).y - center(from).y;
    if (Math.abs(dy) >= Math.abs(dx)) {
        return routeAcross(from, to, dy >= 0 ? 'bottom' : 'top');
    }
    return routeAcross(from, to, dx >= 0 ? 'right' : 'left');
}

export function pointsToPathD(points: GuidePoint[]): string {
    return points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${round(pt.x)},${round(pt.y)}`).join(' ');
}

export function alignDragBox(drag: GuideBox, others: GuideBox[], snap = MMD_ALIGN_SNAP): { box: GuideBox; guides: AlignGuide[]; } {
    const xHit = bestSnap(xAnchors(drag), others.flatMap(xAnchors), snap);
    const yHit = bestSnap(yAnchors(drag), others.flatMap(yAnchors), snap);
    const box = { x: drag.x + (xHit?.delta ?? 0), y: drag.y + (yHit?.delta ?? 0), w: drag.w, h: drag.h };
    const guides: AlignGuide[] = [];
    if (xHit) {
        guides.push(spanGuide('x', box, others, xHit.pos));
    }
    if (yHit) {
        guides.push(spanGuide('y', box, others, yHit.pos));
    }
    return { box, guides };
}

function routeAcross(from: GuideBox, to: GuideBox, exit: Side): GuidePoint[] {
    const start = port(from, exit);
    const entry = opposite(exit);
    const end = port(to, entry);
    const vertical = exit === 'top' || exit === 'bottom';
    const gap = vertical
        ? (exit === 'bottom' ? end.y - start.y : start.y - end.y)
        : (exit === 'right' ? end.x - start.x : start.x - end.x);
    const aligned = vertical ? Math.abs(start.x - end.x) <= STRAIGHT : Math.abs(start.y - end.y) <= STRAIGHT;
    if (aligned && gap >= 0) {
        return dedupe([start, end]);
    }
    if (gap >= STUB) {
        if (vertical) {
            const mid = (start.y + end.y) / 2;
            return dedupe([start, { x: start.x, y: mid }, { x: end.x, y: mid }, end]);
        }
        const mid = (start.x + end.x) / 2;
        return dedupe([start, { x: mid, y: start.y }, { x: mid, y: end.y }, end]);
    }
    return dedupe(routeAround(from, to, start, end, exit));
}

function routeAround(from: GuideBox, to: GuideBox, start: GuidePoint, end: GuidePoint, exit: Side): GuidePoint[] {
    if (exit === 'top' || exit === 'bottom') {
        const down = exit === 'bottom';
        const aroundX = start.x <= end.x
            ? Math.max(from.x + from.w, to.x + to.w) + STUB
            : Math.min(from.x, to.x) - STUB;
        const yOut = down ? start.y + STUB : start.y - STUB;
        const yIn = down ? end.y - STUB : end.y + STUB;
        return [start, { x: start.x, y: yOut }, { x: aroundX, y: yOut }, { x: aroundX, y: yIn }, { x: end.x, y: yIn }, end];
    }
    const right = exit === 'right';
    const aroundY = start.y <= end.y
        ? Math.max(from.y + from.h, to.y + to.h) + STUB
        : Math.min(from.y, to.y) - STUB;
    const xOut = right ? start.x + STUB : start.x - STUB;
    const xIn = right ? end.x - STUB : end.x + STUB;
    return [start, { x: xOut, y: start.y }, { x: xOut, y: aroundY }, { x: xIn, y: aroundY }, { x: xIn, y: end.y }, end];
}

type AnchorKind = 'start' | 'center' | 'end';

type Anchor = {
    pos: number;
    kind: AnchorKind;
    crossStart: number;
    crossEnd: number;
};

function xAnchors(box: GuideBox): Anchor[] {
    return [
        { pos: box.x, kind: 'start', crossStart: box.y, crossEnd: box.y + box.h },
        { pos: box.x + box.w / 2, kind: 'center', crossStart: box.y, crossEnd: box.y + box.h },
        { pos: box.x + box.w, kind: 'end', crossStart: box.y, crossEnd: box.y + box.h },
    ];
}

function yAnchors(box: GuideBox): Anchor[] {
    return [
        { pos: box.y, kind: 'start', crossStart: box.x, crossEnd: box.x + box.w },
        { pos: box.y + box.h / 2, kind: 'center', crossStart: box.x, crossEnd: box.x + box.w },
        { pos: box.y + box.h, kind: 'end', crossStart: box.x, crossEnd: box.x + box.w },
    ];
}

function bestSnap(dragAnchors: Anchor[], otherAnchors: Anchor[], snap: number): { delta: number; pos: number; } | null {
    let best: { delta: number; pos: number; rank: number; } | null = null;
    for (const drag of dragAnchors) {
        for (const other of otherAnchors) {
            const delta = other.pos - drag.pos;
            const distance = Math.abs(delta);
            if (distance > snap) {
                continue;
            }
            const sameKind = drag.kind === other.kind;
            const centerBias = sameKind && drag.kind === 'center' ? -0.02 : 0;
            const rank = distance + (sameKind ? centerBias : 0.01);
            if (!best || rank < best.rank) {
                best = { delta, pos: other.pos, rank };
            }
        }
    }
    return best ? { delta: best.delta, pos: best.pos } : null;
}

function spanGuide(axis: 'x' | 'y', drag: GuideBox, others: GuideBox[], pos: number): AlignGuide {
    const anchorsOf = axis === 'x' ? xAnchors : yAnchors;
    const involved = [drag, ...others].flatMap(anchorsOf).filter((anchor) => Math.abs(anchor.pos - pos) <= 0.75);
    let start = involved[0]?.crossStart ?? 0;
    let end = involved[0]?.crossEnd ?? 0;
    for (const anchor of involved) {
        start = Math.min(start, anchor.crossStart);
        end = Math.max(end, anchor.crossEnd);
    }
    start -= GUIDE_PAD;
    end += GUIDE_PAD;
    const at = round(pos);
    if (axis === 'x') {
        return { x1: at, y1: start, x2: at, y2: end };
    }
    return { x1: start, y1: at, x2: end, y2: at };
}

function center(box: GuideBox): GuidePoint {
    return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

function port(box: GuideBox, side: Side): GuidePoint {
    const mid = center(box);
    switch (side) {
        case 'top':
            return { x: mid.x, y: box.y };
        case 'bottom':
            return { x: mid.x, y: box.y + box.h };
        case 'left':
            return { x: box.x, y: mid.y };
        default:
            return { x: box.x + box.w, y: mid.y };
    }
}

function opposite(side: Side): Side {
    switch (side) {
        case 'top':
            return 'bottom';
        case 'bottom':
            return 'top';
        case 'left':
            return 'right';
        default:
            return 'left';
    }
}

function dedupe(points: GuidePoint[]): GuidePoint[] {
    const out: GuidePoint[] = [];
    for (const pt of points) {
        const prev = out[out.length - 1];
        if (prev && Math.abs(prev.x - pt.x) < 0.01 && Math.abs(prev.y - pt.y) < 0.01) {
            continue;
        }
        out.push(pt);
    }
    return out;
}

function round(n: number): number {
    return Math.round(n * 100) / 100;
}
