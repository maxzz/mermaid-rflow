import { describe, expect, it } from 'vitest';
import { marqueeSelection, withSelectedFlag } from './8-selection';

describe('marqueeSelection', () => {
    it('adds hits to the selection held when the drag began', () => {
        expect(marqueeSelection(['b'], ['ab'], { nodeIds: new Set(['a']), edgeIds: new Set(['keep']) })).toEqual({
            nodeIds: new Set(['a', 'b']),
            edgeIds: new Set(['keep', 'ab']),
        });
    });

    it('replaces the selection when the drag did not begin with Shift', () => {
        expect(marqueeSelection(['b'], ['ab'], null)).toEqual({
            nodeIds: new Set(['b']),
            edgeIds: new Set(['ab']),
        });
    });
});

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
