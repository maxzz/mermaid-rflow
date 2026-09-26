import { describe, expect, it } from 'vitest';
import { ZOOM_MAX, ZOOM_MIN } from '@/store/2-mermaid-settings';
import { computeMmdFit, MMD_FIT_PADDING, mmdFitPan, mmdFitScale } from './8-3-2-mmd-zoom-utils';

describe('computeMmdFit', () => {
    it('scales a tall diagram to the viewport height and centers it', () => {
        const next = computeMmdFit(800, 400, 200, 800);
        const zoom = (400 - MMD_FIT_PADDING) / 800;
        expect(next.zoom).toBeCloseTo(zoom);
        expect(next.x).toBeCloseTo((800 - 200 * zoom) / 2);
        expect(next.y).toBeCloseTo((400 - 800 * zoom) / 2);
    });

    it('scales a wide diagram to the viewport width and centers it', () => {
        const next = computeMmdFit(400, 800, 800, 200);
        const zoom = (400 - MMD_FIT_PADDING) / 800;
        expect(next.zoom).toBeCloseTo(zoom);
        expect(next.x).toBeCloseTo((400 - 800 * zoom) / 2);
        expect(next.y).toBeCloseTo((800 - 200 * zoom) / 2);
    });

    it('clamps to the zoom limits', () => {
        expect(computeMmdFit(8000, 8000, 10, 10).zoom).toBe(ZOOM_MAX);
        expect(computeMmdFit(100, 100, 40000, 40000).zoom).toBe(ZOOM_MIN);
    });
});

describe('mmdFitScale / mmdFitPan', () => {
    it('shrinks a graphic that is larger than the pane', () => {
        expect(mmdFitScale(752, 352, 1200, 900)).toBeCloseTo(352 / 900);
    });

    it('centers the scaled graphic in the viewport', () => {
        const factor = 0.5;
        const pan = mmdFitPan(800, 400, factor, { x: 0, y: 0, w: 1200, h: 800 }, { x: 0, y: 0 });
        expect(pan.x).toBeCloseTo(800 / 2 - 600 * factor);
        expect(pan.y).toBeCloseTo(400 / 2 - 400 * factor);
    });
});
