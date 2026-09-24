import { describe, expect, it } from 'vitest';
import { frameAround, scaleFromCorner, unionBounds } from './8-selection-frame';

describe('selection frame', () => {
    it('wraps every selected box', () => {
        expect(unionBounds([
            { id: 'a', x: 10, y: 20, w: 40, h: 30 },
            { id: 'b', x: 80, y: 0, w: 20, h: 10 },
        ])).toEqual({ x: 10, y: 0, w: 90, h: 50 });
    });

    it('keeps the gap a constant size on screen', () => {
        const bounds = { x: 0, y: 0, w: 100, h: 40 };
        expect(frameAround(bounds, 1).x).toBe(-4);
        expect(frameAround(bounds, 2).x).toBe(-2);
        expect(frameAround(bounds, 0.4).w).toBeCloseTo(100 + 8 / 0.4);
    });

    it('scales every box about the opposite corner', () => {
        const start = [
            { id: 'a', x: 0, y: 0, w: 40, h: 20 },
            { id: 'b', x: 60, y: 30, w: 40, h: 20 },
        ];
        const bounds = unionBounds(start)!;
        const scaled = scaleFromCorner(start, bounds, 'se', { x: bounds.x + bounds.w * 2, y: bounds.y + bounds.h * 2 });
        expect(scaled.find((box) => box.id === 'a')).toMatchObject({ x: 0, y: 0, w: 80, h: 40 });
        expect(scaled.find((box) => box.id === 'b')).toMatchObject({ x: 120, y: 60, w: 80, h: 40 });
    });
});
