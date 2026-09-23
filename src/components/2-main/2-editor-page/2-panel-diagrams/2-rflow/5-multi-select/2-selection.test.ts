import { describe, expect, it } from 'vitest';
import { withSelectedFlag } from './2-selection';

describe('withSelectedFlag', () => {
    const items = [
        { id: 'a', selected: false },
        { id: 'b', selected: true },
    ];

    it('flips only the items whose flag changed', () => {
        const next = withSelectedFlag(items, new Set(['a']));
        expect(next).toEqual([
            { id: 'a', selected: true },
            { id: 'b', selected: false },
        ]);
        expect(next[0]).not.toBe(items[0]);
    });

    it('returns the same array when the selection is already applied', () => {
        expect(withSelectedFlag(items, new Set(['b']))).toBe(items);
    });
});
