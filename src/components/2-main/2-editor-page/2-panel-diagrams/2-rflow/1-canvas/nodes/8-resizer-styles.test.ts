import { describe, expect, it } from 'vitest';
import { resizerStyles } from './8-resizer-styles';

describe('resizerStyles', () => {
    it('keeps handle size, radius, and line thickness constant on screen', () => {
        const atOne = resizerStyles(1);
        const atTwo = resizerStyles(2);

        expect(atOne.handle.width).toBe(12);
        expect(atOne.handle.borderRadius).toBe(3);
        expect(atOne.line.borderWidth).toBe(2);

        expect(atTwo.handle.width).toBe(6);
        expect(atTwo.handle.height).toBe(6);
        expect(atTwo.handle.borderRadius).toBe(1.5);
        expect(atTwo.handle.border).toBe('1px solid white');
        expect(atTwo.line.borderWidth).toBe(1);
    });

    it('treats a missing zoom as 1', () => {
        expect(resizerStyles(0).handle.width).toBe(12);
    });
});
