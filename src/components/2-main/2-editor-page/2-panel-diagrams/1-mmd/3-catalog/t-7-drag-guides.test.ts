import { describe, expect, it } from 'vitest';
import { alignDragBox, orthogonalRoute, pointsToPathD } from './7-drag-guides';

const from = { x: 100, y: 20, w: 80, h: 40 };

describe('orthogonalRoute', () => {
    it('draws a straight connection when the blocks share a center', () => {
        const target = { x: 100, y: 160, w: 80, h: 40 };
        expect(orthogonalRoute(from, target)).toEqual([
            { x: 140, y: 60 },
            { x: 140, y: 160 },
        ]);
    });

    it('jogs sideways between the facing ports', () => {
        const target = { x: 180, y: 160, w: 60, h: 40 };
        const points = orthogonalRoute(from, target);
        expect(points).toEqual([
            { x: 140, y: 60 },
            { x: 140, y: 110 },
            { x: 210, y: 110 },
            { x: 210, y: 160 },
        ]);
        expect(pointsToPathD(points)).toBe('M140,60 L140,110 L210,110 L210,160');
    });

    it('leaves the side when the target is beside the block', () => {
        const beside = { x: 260, y: 20, w: 80, h: 40 };
        expect(orthogonalRoute(from, beside)).toEqual([
            { x: 180, y: 40 },
            { x: 260, y: 40 },
        ]);
    });
});

describe('alignDragBox', () => {
    it('snaps to a neighbor center and returns a solid vertical guide', () => {
        const drag = { x: 104, y: 20, w: 80, h: 40 };
        const other = { x: 100, y: 160, w: 80, h: 40 };
        const aligned = alignDragBox(drag, [other]);
        expect(aligned.box.x).toBe(100);
        expect(aligned.guides).toEqual([
            { x1: 140, y1: 8, x2: 140, y2: 212 },
        ]);
    });

    it('draws a horizontal guide when the tops line up', () => {
        const drag = { x: 200, y: 23, w: 40, h: 40 };
        const other = { x: 20, y: 20, w: 50, h: 80 };
        const aligned = alignDragBox(drag, [other], 6);
        expect(aligned.box.y).toBe(20);
        expect(aligned.guides).toEqual([
            { x1: 8, y1: 20, x2: 252, y2: 20 },
        ]);
    });

    it('leaves the block where it is when nothing is close', () => {
        const drag = { x: 0, y: 0, w: 40, h: 20 };
        const other = { x: 200, y: 200, w: 40, h: 20 };
        const aligned = alignDragBox(drag, [other]);
        expect(aligned.box).toEqual(drag);
        expect(aligned.guides).toEqual([]);
    });
});
