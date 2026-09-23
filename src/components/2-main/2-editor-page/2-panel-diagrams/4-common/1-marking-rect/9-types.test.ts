import { describe, expect, it } from 'vitest';
import { rectContains, rectFromDrag, rectsIntersect } from './9-types';

describe('markingRectFromDrag', () => {
    it('keeps a drag that moves down and right', () => {
        expect(rectFromDrag(10, 20, 40, 50)).toEqual({ x: 10, y: 20, width: 30, height: 30 });
    });

    it('normalizes a drag that moves up and left', () => {
        expect(rectFromDrag(40, 50, 10, 20)).toEqual({ x: 10, y: 20, width: 30, height: 30 });
    });
});

describe('rectsIntersect', () => {
    const box = { x: 0, y: 0, width: 100, height: 40 };

    it('matches a partial overlap', () => {
        expect(rectsIntersect(box, { x: 90, y: 30, width: 20, height: 20 })).toBe(true);
    });

    it('ignores a box that only touches an edge', () => {
        expect(rectsIntersect(box, { x: 100, y: 0, width: 10, height: 10 })).toBe(false);
    });

    it('ignores a box that misses entirely', () => {
        expect(rectsIntersect(box, { x: 200, y: 200, width: 10, height: 10 })).toBe(false);
    });
});

describe('rectContains', () => {
    const box = { x: 0, y: 0, width: 100, height: 40 };

    it('matches a box that shares the outer edge', () => {
        expect(rectContains(box, { x: 0, y: 0, width: 100, height: 40 })).toBe(true);
    });

    it('rejects a partial overlap', () => {
        expect(rectContains(box, { x: 90, y: 30, width: 20, height: 20 })).toBe(false);
    });
});
