import { getDefaultStore } from 'jotai';
import { ZOOM_MAX, ZOOM_MIN } from '@/store/2-mermaid-settings';
import { mmdPanAtom, mmdZoomAtom, type MmdPan } from '../store/3-mmd-ui';

export const MMD_FIT_PADDING = 48;

const GRAPHIC_SEL = 'g.node, g.cluster, g.actor, g.classGroup, g.edgePath, path.flowchart-link, .edgeLabel, .nodeLabel, foreignObject, text';

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

/**
 * Scale whatever is currently painted so it fits the parent pane, then center it.
 * Uses on-screen node/edge bounds — not the SVG viewBox, which is often smaller than the graphic.
 */
export function fitMmdToView(viewport: HTMLElement | null, content: HTMLElement | null) {
    const store = getDefaultStore();
    if (!viewport || !content) {
        store.set(mmdZoomAtom, 1);
        store.set(mmdPanAtom, { x: 0, y: 0 });
        return;
    }

    const svg = content.querySelector('svg');
    if (!(svg instanceof SVGSVGElement)) {
        store.set(mmdZoomAtom, 1);
        store.set(mmdPanAtom, { x: 0, y: 0 });
        return;
    }

    const vp = viewport.getBoundingClientRect();
    const graphic = measureMmdScreenRect(content, svg, viewport);
    const pad = MMD_FIT_PADDING;
    const availW = vp.width - pad;
    const availH = vp.height - pad;
    if (availW <= 0 || availH <= 0 || graphic.w < 1 || graphic.h < 1) {
        return;
    }

    const currentZoom = store.get(mmdZoomAtom) || 1;
    const pan = store.get(mmdPanAtom);
    const factor = mmdFitScale(availW, availH, graphic.w, graphic.h);
    const zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, currentZoom * factor));
    const applied = zoom / currentZoom;

    store.set(mmdZoomAtom, zoom);
    store.set(mmdPanAtom, mmdFitPan(vp.width, vp.height, applied, graphic, pan));
}

export function mmdFitScale(availW: number, availH: number, screenW: number, screenH: number): number {
    if (availW <= 0 || availH <= 0 || screenW < 1 || screenH < 1) {
        return 1;
    }
    return Math.min(availW / screenW, availH / screenH);
}

/** New pan so the scaled graphic is centered in the viewport. Scale origin is the board's top-left (current pan). */
export function mmdFitPan(
    viewportW: number,
    viewportH: number,
    factor: number,
    graphic: { x: number; y: number; w: number; h: number; },
    pan: MmdPan,
): MmdPan {
    const cx = graphic.x + graphic.w / 2;
    const cy = graphic.y + graphic.h / 2;
    return {
        x: viewportW / 2 - (cx - pan.x) * factor,
        y: viewportH / 2 - (cy - pan.y) * factor,
    };
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

/** Painted bounds of the diagram, in viewport-local pixels (origin = viewport top-left). */
export function measureMmdScreenRect(
    root: Element,
    svg: SVGSVGElement,
    viewport?: HTMLElement | null,
): { x: number; y: number; w: number; h: number; } {
    const origin = viewport?.getBoundingClientRect();
    const ox = origin?.left ?? 0;
    const oy = origin?.top ?? 0;

    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;

    function add(rect: DOMRectReadOnly) {
        if (rect.width < 0.5 && rect.height < 0.5) {
            return;
        }
        left = Math.min(left, rect.left - ox);
        top = Math.min(top, rect.top - oy);
        right = Math.max(right, rect.right - ox);
        bottom = Math.max(bottom, rect.bottom - oy);
    }

    add(svg.getBoundingClientRect());
    for (const el of root.querySelectorAll(GRAPHIC_SEL)) {
        add(el.getBoundingClientRect());
    }

    if (!Number.isFinite(left) || right - left < 1 || bottom - top < 1) {
        const r = svg.getBoundingClientRect();
        return { x: r.left - ox, y: r.top - oy, w: r.width, h: r.height };
    }
    return { x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * Pin the SVG to an explicit pixel size so `width: 100%` / inline `max-width` cannot
 * steal the parent pane's size and make Fit a no-op.
 */
export function normalizeMmdSvg(svg: SVGSVGElement): { w: number; h: number; } {
    const size = intrinsicSvgSize(svg);
    svg.style.maxWidth = 'none';
    svg.style.maxHeight = 'none';
    svg.style.width = `${size.w}px`;
    svg.style.height = `${size.h}px`;
    svg.setAttribute('width', String(size.w));
    svg.setAttribute('height', String(size.h));
    return size;
}

/** Intrinsic diagram size — layout pixels, never the already-scaled CSS box. */
export function measureMmdNaturalSize(content: HTMLElement | null): { w: number; h: number; } {
    if (!content) {
        return { w: 0, h: 0 };
    }
    const svg = content.querySelector('svg');
    if (!(svg instanceof SVGSVGElement)) {
        return { w: content.offsetWidth, h: content.offsetHeight };
    }
    return intrinsicSvgSize(svg);
}

function svgLayoutSize(svg: SVGSVGElement): { w: number; h: number; } {
    const el = svg as unknown as { offsetWidth: number; offsetHeight: number; };
    return { w: el.offsetWidth, h: el.offsetHeight };
}

function intrinsicSvgSize(svg: SVGSVGElement): { w: number; h: number; } {
    const attrW = parseAbsoluteLength(svg.getAttribute('width'));
    const attrH = parseAbsoluteLength(svg.getAttribute('height'));
    const vb = parseViewBox(svg);
    const layout = svgLayoutSize(svg);

    let w = attrW || layout.w || vb.w;
    let h = attrH || layout.h || vb.h;

    try {
        const bbox = svg.getBBox();
        if (bbox.width > 0 && bbox.height > 0) {
            if (vb.w > 0 && vb.h > 0 && w > 0 && h > 0) {
                const pxX = w / vb.w;
                const pxY = h / vb.h;
                w = Math.max(w, (bbox.x + bbox.width) * pxX, bbox.width * pxX);
                h = Math.max(h, (bbox.y + bbox.height) * pxY, bbox.height * pxY);
            }
            else {
                w = Math.max(w, bbox.width);
                h = Math.max(h, bbox.height);
            }
        }
    }
    catch {
        // SVG is not in the document yet
    }

    return { w: w > 0 ? w : 0, h: h > 0 ? h : 0 };
}

function parseViewBox(svg: SVGSVGElement): { w: number; h: number; } {
    const vb = (svg.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
        return { w: vb[2], h: vb[3] };
    }
    return { w: 0, h: 0 };
}

function parseAbsoluteLength(value: string | null): number {
    if (!value || value.endsWith('%')) {
        return 0;
    }
    const n = parseFloat(value);
    return n > 0 ? n : 0;
}
