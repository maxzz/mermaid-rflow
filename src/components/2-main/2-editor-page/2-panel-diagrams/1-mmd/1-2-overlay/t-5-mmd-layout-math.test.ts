import { describe, expect, it } from 'vitest';
import { parseTranslateAttr, shiftPathD } from './8-mmd-layout-math';

describe('shiftPathD', () => {
    it('lerps start and end of a cubic path', () => {
        const d = 'M 0,0 C 0,50 50,100 100,100';
        expect(shiftPathD(d, { dx: 10, dy: 20 }, { dx: 0, dy: 0 })).toBe('M 10,20 C 6.67,63.33 53.33,106.67 100,100');
    });

    it('returns the original path when offsets are zero', () => {
        const d = 'M 8,9 L 10,11';
        expect(shiftPathD(d, { dx: 0, dy: 0 }, { dx: 0, dy: 0 })).toBe(d);
    });
});

describe('parseTranslateAttr', () => {
    it('reads comma and space translate forms', () => {
        expect(parseTranslateAttr('translate(12.5, 40)')).toEqual({ x: 12.5, y: 40 });
        expect(parseTranslateAttr('translate(3 4) scale(1)')).toEqual({ x: 3, y: 4 });
    });
});
