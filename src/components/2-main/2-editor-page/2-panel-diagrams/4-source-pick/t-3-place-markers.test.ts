import { describe, expect, it } from 'vitest';
import { connectionCaption, markerShape } from './2-marker-shape';
import { edgeLabelPlace, placeEdgeMarker, placeNodeMarker } from './3-place-markers';
import { sourcePickAppearId } from './4-settled-atoms';

const view = { tx: 10, ty: 20, zoom: 2 };

describe('markerShape', () => {
    it('uses a circle for a single letter and a pill otherwise', () => {
        expect(markerShape('C')).toBe('circle');
        expect(markerShape(' Ω ')).toBe('circle');
        expect(markerShape('n1')).toBe('pill');
        expect(markerShape('Ship')).toBe('pill');
        expect(markerShape('1')).toBe('pill');
        expect(markerShape('')).toBe('pill');
    });
});

describe('connectionCaption', () => {
    it('prints the connection the way the source writes it', () => {
        expect(connectionCaption('A', 'B')).toBe('A --> B');
        expect(connectionCaption('B', 'C', '-->', 'Yes')).toBe('B -->|Yes| C');
        expect(connectionCaption('D', 'B', '-.-')).toBe('D -.-> B');
    });
});

describe('placeNodeMarker', () => {
    it('flies from the block center to its top-left corner', () => {
        const marker = placeNodeMarker({ key: 'node:C', name: 'C', x: 100, y: 50, w: 40, h: 20 }, view);
        expect(marker.shape).toBe('circle');
        expect(marker.name).toBe('C');
        expect(marker.center).toEqual({ x: 250, y: 140 });
        expect(marker.corner).toEqual({ x: 210, y: 120 });
    });

    it('keeps a longer id as a pill', () => {
        const marker = placeNodeMarker({ key: 'node:n1', name: 'n1', x: 0, y: 0, w: 10, h: 10 }, { tx: 0, ty: 0, zoom: 1 });
        expect(marker.shape).toBe('pill');
        expect(marker.name).toBe('n1');
    });
});

describe('placeEdgeMarker', () => {
    it('parks the caption at the start of a downward line, on the left', () => {
        const marker = placeEdgeMarker({ key: 'edge:A>B', text: 'A --> B', x: 100, y: 80, dx: 0, dy: 1 }, view);
        expect(marker.text).toBe('A --> B');
        expect(marker.place).toBe('down-left');
        expect(marker.at).toEqual({ x: 210, y: 186 });
    });

    it('steps a second caption further along the same side', () => {
        const first = placeEdgeMarker({ key: 'e1', text: 'A --> B', x: 0, y: 0, dx: 0, dy: 1 }, { tx: 0, ty: 0, zoom: 1 });
        const second = placeEdgeMarker({ key: 'e2', text: 'A --> C', x: 0, y: 0, dx: 0, dy: 1 }, { tx: 0, ty: 0, zoom: 1 }, 1);
        expect(second.place).toBe(first.place);
        expect(second.at.x).toBe(first.at.x);
        expect(second.at.y).toBe(first.at.y + 32);
    });
});

describe('edgeLabelPlace', () => {
    it('puts the caption on the side opposite the bend', () => {
        expect(edgeLabelPlace({ x: 40, y: 80, dx: 0, dy: 1, towardX: 10, towardY: 160 })).toBe('down-right');
        expect(edgeLabelPlace({ x: 40, y: 80, dx: 0, dy: 1, towardX: 90, towardY: 160 })).toBe('down-left');
        expect(edgeLabelPlace({ x: 40, y: 80, dx: 1, dy: 0, towardX: 120, towardY: 140 })).toBe('right-above');
        expect(edgeLabelPlace({ x: 40, y: 80, dx: 1, dy: 0, towardX: 120, towardY: 20 })).toBe('right-below');
    });
});

describe('sourcePickAppearId', () => {
    it('changes when the selection changes and again when it returns', () => {
        const first = sourcePickAppearId('line:4');
        expect(sourcePickAppearId('line:4')).toBe(first);
        const cleared = sourcePickAppearId('');
        expect(cleared).toBe(first + 1);
        expect(sourcePickAppearId('line:4')).toBe(first + 2);
    });
});
