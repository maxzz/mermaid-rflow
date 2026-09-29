import { describe, expect, it } from 'vitest';
import { edgeAnchor, flowSourceMarkers, keysToMark, type MeasuredNode } from './1-flow-pick-model';

const node = (id: string, extra: Partial<MeasuredNode> = {}): MeasuredNode => ({
    id,
    key: `node:${id}`,
    name: id,
    x: 0,
    y: 0,
    w: 80,
    h: 40,
    handles: [{ id: 'bottom-source', x: 35, y: 36, width: 10, height: 8, position: 'bottom' }],
    ...extra,
});

describe('keysToMark', () => {
    it('marks a declared block and ignores endpoint mentions on a connection line', () => {
        expect(keysToMark(['node:A', 'node:B', 'edge:A>B'], new Set(['node:A']))).toEqual({
            blocks: ['node:A'],
            edges: ['edge:A>B'],
        });
    });

    it('marks only the connection when neither endpoint is declared on the line', () => {
        expect(keysToMark(['node:A', 'node:B', 'edge:A>B'], new Set())).toEqual({
            blocks: [],
            edges: ['edge:A>B'],
        });
    });

    it('marks a block line even when the index has not flagged a definition', () => {
        expect(keysToMark(['node:C'], new Set())).toEqual({
            blocks: ['node:C'],
            edges: [],
        });
    });
});

describe('edgeAnchor', () => {
    it('starts at the center of the source handle', () => {
        expect(edgeAnchor(node('A', {
            handles: [{ id: 'right-source', x: 72, y: 12, width: 8, height: 8, position: 'right' }],
        }), 'right-source')).toEqual({ x: 76, y: 16, dx: 1, dy: 0 });
    });

    it('falls back to the bottom center when handles are not measured yet', () => {
        expect(edgeAnchor({ ...node('A'), handles: null })).toEqual({ x: 40, y: 40, dx: 0, dy: 1 });
    });
});

describe('flowSourceMarkers', () => {
    const nodes = [
        node('A', { x: 10, y: 20 }),
        node('C', { x: 10, y: 120, name: 'C' }),
        node('StartNode', { id: 'StartNode', key: 'node:StartNode', name: 'StartNode', x: 200, y: 20 }),
    ];
    const edges = [{
        key: 'edge:A>C',
        text: 'A --> C',
        sourceId: 'A',
        targetId: 'C',
        sourceHandle: 'bottom-source',
    }];

    it('places a circle on a one-letter declaration', () => {
        const markers = flowSourceMarkers({
            keys: ['node:C'],
            line: 4,
            hitsFor: () => [{ line: 4, isDefinition: true }],
            nodes,
            edges,
            view: { tx: 0, ty: 0, zoom: 1 },
        });
        expect(markers).toEqual([
            expect.objectContaining({ kind: 'node', name: 'C', shape: 'circle', corner: { x: 10, y: 120 } }),
        ]);
    });

    it('places the connection caption at the start of the line and skips endpoint blocks', () => {
        const markers = flowSourceMarkers({
            keys: ['node:A', 'node:C', 'edge:A>C'],
            line: 7,
            hitsFor: () => [{ line: 7, isDefinition: false }],
            nodes,
            edges,
            view: { tx: 0, ty: 0, zoom: 1 },
        });
        expect(markers.map((marker) => marker.kind)).toEqual(['edge']);
        expect(markers[0]).toEqual(expect.objectContaining({ text: 'A --> C', place: 'down-left' }));
    });

    it('uses a pill when the node id is longer than one letter', () => {
        const markers = flowSourceMarkers({
            keys: ['node:StartNode'],
            line: 2,
            hitsFor: () => undefined,
            nodes,
            edges: [],
            view: { tx: 0, ty: 0, zoom: 1 },
        });
        expect(markers[0]).toEqual(expect.objectContaining({ kind: 'node', name: 'StartNode', shape: 'pill' }));
    });
});
