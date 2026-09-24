import { describe, expect, it } from 'vitest';
import { edgeIdsForNodes, idsInScreenRect, nodeIdsInFlowRect, screenRectToFlow } from './8-hit-test-math';

const nodes = [
    { id: 'a', x: 0, y: 0, width: 100, height: 40 },
    { id: 'b', x: 200, y: 0, width: 100, height: 40 },
    { id: 'hidden', x: 0, y: 0, width: 100, height: 40, hidden: true },
    { id: 'locked-out', x: 0, y: 0, width: 100, height: 40, selectable: false },
    { id: 'unmeasured', x: 0, y: 0, width: 0, height: 0 },
];

describe('screenRectToFlow', () => {
    it('divides a screen rectangle by zoom and subtracts the pan', () => {
        expect(screenRectToFlow({ x: 100, y: 40, width: 20, height: 10 }, { x: 20, y: 0, zoom: 2 })).toEqual({
            x: 40,
            y: 20,
            width: 10,
            height: 5,
        });
    });
});

describe('nodeIdsInFlowRect', () => {
    it('returns nodes the rectangle overlaps and skips hidden, unselectable, and unmeasured nodes', () => {
        expect(nodeIdsInFlowRect(nodes, { x: 80, y: 10, width: 30, height: 20 })).toEqual(['a']);
    });

    it('returns only nodes the rectangle covers completely', () => {
        expect(nodeIdsInFlowRect(nodes, { x: -10, y: -10, width: 120, height: 60 }, 'inside')).toEqual(['a']);
        expect(nodeIdsInFlowRect(nodes, { x: 80, y: 10, width: 30, height: 20 }, 'inside')).toEqual([]);
    });
});

describe('edgeIdsForNodes', () => {
    const edges = [
        { id: 'ab', source: 'a', target: 'b' },
        { id: 'ac', source: 'a', target: 'c' },
        { id: 'skip', source: 'a', target: 'b', selectable: false },
    ];

    it('keeps edges whose both ends are selected', () => {
        expect(edgeIdsForNodes(edges, new Set(['a', 'b']))).toEqual(['ab']);
    });
});

describe('idsInScreenRect', () => {
    it('maps a zoomed screen rectangle onto flow nodes', () => {
        const ids = idsInScreenRect(
            nodes,
            [{ id: 'ab', source: 'a', target: 'b' }],
            { x: 0, y: 0, width: 180, height: 80 },
            { x: 0, y: 0, zoom: 2 },
        );
        expect(ids).toEqual({ nodeIds: ['a'], edgeIds: [] });
    });
});
