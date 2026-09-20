import { getDefaultStore } from 'jotai';
import { ZOOM_MAX, ZOOM_MIN } from '@/store/2-mermaid-settings';
import { mmdPanAtom, mmdZoomAtom, type MmdPan } from '../store/3-mmd-ui';

export const MMD_FIT_PADDING = 48;

export function setMmdZoom(next: number, viewport?: HTMLElement | null) {
    const store = getDefaultStore();
    const prev = store.get(mmdZoomAtom);
    const zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
    store.set(mmdZoomAtom, zoom);
    if (!viewport || prev <= 0 || zoom === prev) {
        return;
    }
    const pan = store.get(mmdPanAtom);
    const k = zoom / prev;
    const cx = viewport.clientWidth / 2;
    const cy = viewport.clientHeight / 2;
    store.set(mmdPanAtom, {
        x: cx - (cx - pan.x) * k,
        y: cy - (cy - pan.y) * k,
    });
}

export function setMmdPan(next: MmdPan) {
    getDefaultStore().set(mmdPanAtom, next);
}

/** Scale and center the diagram in the parent-sized viewport. */
export function fitMmdToView(viewport: HTMLElement | null, content: HTMLElement | null) {
    const natural = measureMmdNaturalSize(content);
    if (!viewport || natural.w <= 0 || natural.h <= 0) {
        getDefaultStore().set(mmdZoomAtom, 1);
        getDefaultStore().set(mmdPanAtom, { x: 0, y: 0 });
        return;
    }
    const next = computeMmdFit(viewport.clientWidth, viewport.clientHeight, natural.w, natural.h);
    getDefaultStore().set(mmdZoomAtom, next.zoom);
    getDefaultStore().set(mmdPanAtom, { x: next.x, y: next.y });
}

export function computeMmdFit(
    viewportW: number,
    viewportH: number,
    naturalW: number,
    naturalH: number,
    padding = MMD_FIT_PADDING,
): { zoom: number; x: number; y: number; } {
    if (viewportW <= padding || viewportH <= padding || naturalW <= 0 || naturalH <= 0) {
        return { zoom: 1, x: 0, y: 0 };
    }
    const zoom = Math.max(
        ZOOM_MIN,
        Math.min(ZOOM_MAX, Math.min((viewportW - padding) / naturalW, (viewportH - padding) / naturalH)),
    );
    return {
        zoom,
        x: (viewportW - naturalW * zoom) / 2,
        y: (viewportH - naturalH * zoom) / 2,
    };
}

/** Intrinsic diagram size — never the already-scaled CSS box. */
export function measureMmdNaturalSize(content: HTMLElement | null): { w: number; h: number; } {
    if (!content) {
        return { w: 0, h: 0 };
    }
    const svg = content.querySelector('svg');
    if (!(svg instanceof SVGSVGElement)) {
        return { w: content.offsetWidth, h: content.offsetHeight };
    }

    const vb = (svg.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
        return { w: vb[2], h: vb[3] };
    }

    const attrW = parseAbsoluteLength(svg.getAttribute('width'));
    const attrH = parseAbsoluteLength(svg.getAttribute('height'));
    if (attrW > 0 && attrH > 0) {
        return { w: attrW, h: attrH };
    }

    try {
        const box = svg.getBBox();
        if (box.width > 0 && box.height > 0) {
            return { w: box.width, h: box.height };
        }
    }
    catch {
        // SVG is not in the document yet
    }

    return { w: content.offsetWidth, h: content.offsetHeight };
}

function parseAbsoluteLength(value: string | null): number {
    if (!value || value.endsWith('%')) {
        return 0;
    }
    const n = parseFloat(value);
    return n > 0 ? n : 0;
}
