import { SOURCE_LINK_HIT_ATTR, SOURCE_LINK_KEY_ATTR } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { edgeEndpointsFromDomId, mermaidIdFromDomId } from './3-catalog-mmd';
import { orthogonalRoute, pointsToPathD, type GuideBox } from './7-drag-guides';

export type MmdNodePos = { x: number; y: number; };
export type MmdNodeOffset = { dx: number; dy: number; };

export const MMD_ORIGIN_TRANSFORM = 'data-mmd-ot';
export const MMD_ORIGIN_D = 'data-mmd-od';
const MMD_DRAG_LINK = 'data-mmd-drag-link';
const MMD_DRAG_LABEL = 'data-mmd-drag-label';

export function parseTranslateAttr(transform: string): MmdNodePos {
    const match = transform.match(/translate\(\s*(-?[\d.eE+-]+)(?:[,\s]+|\s+)(-?[\d.eE+-]+)/);
    if (!match?.[1] || !match[2]) {
        return { x: 0, y: 0 };
    }
    return { x: Number(match[1]), y: Number(match[2]) };
}

export function shiftPathD(d: string, from: MmdNodeOffset | undefined, to: MmdNodeOffset | undefined): string {
    const start = from ?? { dx: 0, dy: 0 };
    const end = to ?? { dx: 0, dy: 0 };
    if (start.dx === 0 && start.dy === 0 && end.dx === 0 && end.dy === 0) {
        return d;
    }
    const nums: { start: number; end: number; value: number; }[] = [];
    const re = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(d))) {
        nums.push({ start: match.index, end: match.index + match[0].length, value: Number(match[0]) });
    }
    const pairs = Math.floor(nums.length / 2);
    if (pairs === 0) {
        return d;
    }
    let out = '';
    let last = 0;
    for (let i = 0; i < pairs; i++) {
        const t = pairs === 1 ? 0 : i / (pairs - 1);
        const dx = start.dx + (end.dx - start.dx) * t;
        const dy = start.dy + (end.dy - start.dy) * t;
        const x = nums[i * 2]!;
        const y = nums[i * 2 + 1]!;
        out += d.slice(last, x.start) + fmt(x.value + dx);
        last = x.end;
        out += d.slice(last, y.start) + fmt(y.value + dy);
        last = y.end;
    }
    return out + d.slice(last);
}

/** Pointer pixels → SVG user units via the live screen CTM (viewBox/rect is non-uniform after SVG size pinning). */
export function clientDeltaToSvg(svg: SVGSVGElement, dx: number, dy: number): MmdNodeOffset {
    const ctm = svg.getScreenCTM();
    if (!ctm) {
        return { dx, dy };
    }
    try {
        const inv = ctm.inverse();
        const from = new DOMPoint(0, 0).matrixTransform(inv);
        const to = new DOMPoint(dx, dy).matrixTransform(inv);
        return { dx: to.x - from.x, dy: to.y - from.y };
    }
    catch {
        return { dx, dy };
    }
}

export function collectMmdNodeIds(root: Element): string[] {
    const ids: string[] = [];
    for (const el of root.querySelectorAll('g.node')) {
        const id = mermaidIdFromDomId(el.id);
        if (id) {
            ids.push(id);
        }
    }
    return ids;
}

export function originOfNode(el: Element): MmdNodePos {
    return parseTranslateAttr(el.getAttribute(MMD_ORIGIN_TRANSFORM) ?? el.getAttribute('transform') ?? '');
}

export type MmdHitBox = {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
};

export function overlayScale(host: HTMLElement): { x: number; y: number; } {
    const rect = host.getBoundingClientRect();
    const sx = host.offsetWidth > 0 ? rect.width / host.offsetWidth : 1;
    const sy = host.offsetHeight > 0 ? rect.height / host.offsetHeight : 1;
    return {
        x: Number.isFinite(sx) && sx > 0 ? sx : 1,
        y: Number.isFinite(sy) && sy > 0 ? sy : 1,
    };
}

export function clientPointInOverlay(host: HTMLElement, clientX: number, clientY: number): { x: number; y: number; } {
    const rect = host.getBoundingClientRect();
    const scale = overlayScale(host);
    return {
        x: (clientX - rect.left) / scale.x,
        y: (clientY - rect.top) / scale.y,
    };
}

export function measureMmdNodeBoxes(root: Element, host: HTMLElement): MmdHitBox[] {
    const hostRect = host.getBoundingClientRect();
    const scale = overlayScale(host);
    const boxes: MmdHitBox[] = [];
    for (const el of root.querySelectorAll('g.node')) {
        const id = mermaidIdFromDomId(el.id);
        if (!id) {
            continue;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) {
            continue;
        }
        boxes.push({
            id,
            x: (rect.left - hostRect.left) / scale.x,
            y: (rect.top - hostRect.top) / scale.y,
            w: rect.width / scale.x,
            h: rect.height / scale.y,
        });
    }
    return boxes;
}

export type OverlayPt = { x: number; y: number; };

export type MmdEdgeHit = {
    from: string;
    to: string;
    key: string;
    points: OverlayPt[];
};

export function measureMmdEdges(root: Element, host: HTMLElement): MmdEdgeHit[] {
    const known = collectMmdNodeIds(root);
    const edges: MmdEdgeHit[] = [];
    const seen = new Set<string>();
    for (const el of root.querySelectorAll('path.flowchart-link')) {
        if (!(el instanceof SVGPathElement) || el.hasAttribute(SOURCE_LINK_HIT_ATTR)) {
            continue;
        }
        const pair = edgeEndpointsFromDomId(el.id || el.parentElement?.id || '', known);
        if (!pair) {
            continue;
        }
        const points = pathToOverlayPoints(el, host);
        if (points.length < 2) {
            continue;
        }
        const taggedKey = el.getAttribute(SOURCE_LINK_KEY_ATTR)
            || el.closest(`[${SOURCE_LINK_KEY_ATTR}]`)?.getAttribute(SOURCE_LINK_KEY_ATTR);
        const key = taggedKey?.startsWith('edge:') ? taggedKey : `edge:${pair.from}>${pair.to}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        edges.push({ from: pair.from, to: pair.to, key, points });
    }
    return edges;
}

function pathToOverlayPoints(path: SVGPathElement, host: HTMLElement): OverlayPt[] {
    const ctm = path.getScreenCTM();
    if (!ctm) {
        return [];
    }
    let length = 0;
    try {
        length = path.getTotalLength();
    }
    catch {
        return [];
    }
    if (length < 1) {
        return [];
    }
    const steps = Math.max(8, Math.min(40, Math.ceil(length / 10)));
    const pts: OverlayPt[] = [];
    for (let i = 0; i <= steps; i++) {
        const p = path.getPointAtLength((length * i) / steps);
        const screen = new DOMPoint(p.x, p.y).matrixTransform(ctm);
        pts.push(clientPointInOverlay(host, screen.x, screen.y));
    }
    return pts;
}

export function applyMmdLayout(root: Element, nodes: Record<string, MmdNodePos>): void {
    const originById: Record<string, MmdNodePos> = {};
    const knownIds: string[] = [];

    for (const el of root.querySelectorAll('g.node')) {
        snapshotOriginTransform(el);
        const id = mermaidIdFromDomId(el.id);
        if (!id) {
            continue;
        }
        knownIds.push(id);
        const origin = restoreOrigin(el);
        originById[id] = origin;
        const stored = nodes[id];
        if (!stored) {
            continue;
        }
        const dx = stored.x - origin.x;
        const dy = stored.y - origin.y;
        if (dx === 0 && dy === 0) {
            continue;
        }
        const ot = el.getAttribute(MMD_ORIGIN_TRANSFORM) ?? '';
        el.setAttribute('transform', joinTransform(ot, dx, dy));
    }

    const paths = [...root.querySelectorAll('path.flowchart-link')];
    const livePaths = paths.filter((path) => !path.hasAttribute(SOURCE_LINK_HIT_ATTR));
    for (const path of paths) {
        snapshotOriginD(path);
        const d0 = path.getAttribute(MMD_ORIGIN_D) ?? path.getAttribute('d') ?? '';
        const pair = edgeEndpointsFromDomId(path.id || path.parentElement?.id || '', knownIds);
        if (!pair) {
            path.setAttribute('d', d0);
            continue;
        }
        path.setAttribute('d', shiftPathD(d0, offsetOf(pair.from, nodes, originById), offsetOf(pair.to, nodes, originById)));
    }

    const labels = [...root.querySelectorAll('g.edgeLabel')];
    if (livePaths.length !== labels.length) {
        return;
    }
    livePaths.forEach((path, i) => {
        const label = labels[i];
        if (!(label instanceof Element)) {
            return;
        }
        snapshotOriginTransform(label);
        restoreOrigin(label);
        const pair = edgeEndpointsFromDomId(path.id || path.parentElement?.id || '', knownIds);
        if (!pair) {
            return;
        }
        const from = offsetOf(pair.from, nodes, originById);
        const to = offsetOf(pair.to, nodes, originById);
        const dx = (from.dx + to.dx) / 2;
        const dy = (from.dy + to.dy) / 2;
        if (dx === 0 && dy === 0) {
            return;
        }
        const ot = label.getAttribute(MMD_ORIGIN_TRANSFORM) ?? '';
        label.setAttribute('transform', joinTransform(ot, dx, dy));
    });
}

/** Move one node and preview its connections as the orthogonal route they will take on release. */
export function applyMmdNodeDrag(root: Element, dragId: string, pos: MmdNodePos, nodes: Record<string, MmdNodePos>): void {
    const originById: Record<string, MmdNodePos> = {};
    const knownIds: string[] = [];
    const nodeEl: Record<string, Element> = {};
    const liveNodes = { ...nodes, [dragId]: pos };

    for (const el of root.querySelectorAll('g.node')) {
        snapshotOriginTransform(el);
        const id = mermaidIdFromDomId(el.id);
        if (!id) {
            continue;
        }
        knownIds.push(id);
        nodeEl[id] = el;
        originById[id] = parseTranslateAttr(el.getAttribute(MMD_ORIGIN_TRANSFORM) ?? '');
        if (id !== dragId) {
            continue;
        }
        const origin = originById[id];
        const dx = pos.x - origin.x;
        const dy = pos.y - origin.y;
        const ot = el.getAttribute(MMD_ORIGIN_TRANSFORM) ?? '';
        if (dx === 0 && dy === 0) {
            if (ot) {
                el.setAttribute('transform', ot);
            }
            else {
                el.removeAttribute('transform');
            }
        }
        else {
            el.setAttribute('transform', joinTransform(ot, dx, dy));
        }
    }

    const paths = [...root.querySelectorAll('path.flowchart-link')];
    const livePaths = paths.filter((path) => !path.hasAttribute(SOURCE_LINK_HIT_ATTR));
    for (const path of paths) {
        snapshotOriginD(path);
        const pair = edgeEndpointsFromDomId(path.id || path.parentElement?.id || '', knownIds);
        if (!pair || (pair.from !== dragId && pair.to !== dragId)) {
            continue;
        }
        const routed = path instanceof SVGPathElement
            ? orthogonalEdgeD(path, nodeEl[pair.from], nodeEl[pair.to])
            : null;
        if (routed) {
            path.setAttribute('d', routed);
            path.setAttribute(MMD_DRAG_LINK, '');
            if (!path.hasAttribute(SOURCE_LINK_HIT_ATTR) && path instanceof SVGElement) {
                path.style.visibility = 'hidden';
            }
            continue;
        }
        const d0 = path.getAttribute(MMD_ORIGIN_D) ?? path.getAttribute('d') ?? '';
        path.setAttribute('d', shiftPathD(d0, offsetOf(pair.from, liveNodes, originById), offsetOf(pair.to, liveNodes, originById)));
    }

    const labels = [...root.querySelectorAll('g.edgeLabel')];
    if (livePaths.length !== labels.length) {
        return;
    }
    livePaths.forEach((path, i) => {
        const label = labels[i];
        if (!(label instanceof Element)) {
            return;
        }
        const pair = edgeEndpointsFromDomId(path.id || path.parentElement?.id || '', knownIds);
        if (!pair || (pair.from !== dragId && pair.to !== dragId)) {
            return;
        }
        if (label instanceof SVGElement) {
            label.style.visibility = 'hidden';
            label.setAttribute(MMD_DRAG_LABEL, '');
        }
        snapshotOriginTransform(label);
        restoreOrigin(label);
        const from = offsetOf(pair.from, liveNodes, originById);
        const to = offsetOf(pair.to, liveNodes, originById);
        const dx = (from.dx + to.dx) / 2;
        const dy = (from.dy + to.dy) / 2;
        if (dx === 0 && dy === 0) {
            return;
        }
        const ot = label.getAttribute(MMD_ORIGIN_TRANSFORM) ?? '';
        label.setAttribute('transform', joinTransform(ot, dx, dy));
    });
}

/** Keep the dragged orthogonal routes after the pointer is released. */
export function bakeMmdDragEdges(root: Element, nodes: Record<string, MmdNodePos>): void {
    const originById: Record<string, MmdNodePos> = {};
    const knownIds: string[] = [];
    for (const el of root.querySelectorAll('g.node')) {
        snapshotOriginTransform(el);
        const id = mermaidIdFromDomId(el.id);
        if (!id) {
            continue;
        }
        knownIds.push(id);
        originById[id] = parseTranslateAttr(el.getAttribute(MMD_ORIGIN_TRANSFORM) ?? '');
    }

    for (const path of root.querySelectorAll('path.flowchart-link')) {
        if (!path.hasAttribute(MMD_DRAG_LINK)) {
            continue;
        }
        const pair = edgeEndpointsFromDomId(path.id || path.parentElement?.id || '', knownIds);
        const visual = path.getAttribute('d') ?? '';
        if (pair) {
            const from = offsetOf(pair.from, nodes, originById);
            const to = offsetOf(pair.to, nodes, originById);
            path.setAttribute(MMD_ORIGIN_D, shiftPathD(visual, { dx: -from.dx, dy: -from.dy }, { dx: -to.dx, dy: -to.dy }));
        }
        if (path instanceof SVGElement) {
            path.style.visibility = '';
        }
        path.removeAttribute(MMD_DRAG_LINK);
    }

    for (const label of root.querySelectorAll(`[${MMD_DRAG_LABEL}]`)) {
        if (label instanceof SVGElement) {
            label.style.visibility = '';
        }
        label.removeAttribute(MMD_DRAG_LABEL);
    }
}

export type MmdDragLinkPreview = {
    key: string;
    color: string;
    points: OverlayPt[];
};

/** Dashed overlay geometry for connections hidden while a block is dragged. */
export function mmdDragLinkPreviews(root: Element, host: HTMLElement): MmdDragLinkPreview[] {
    const previews: MmdDragLinkPreview[] = [];
    for (const path of root.querySelectorAll('path.flowchart-link')) {
        if (!path.hasAttribute(MMD_DRAG_LINK) || path.hasAttribute(SOURCE_LINK_HIT_ATTR) || !(path instanceof SVGPathElement)) {
            continue;
        }
        const points = pathPointsInOverlay(path, host);
        if (points.length < 2) {
            continue;
        }
        previews.push({
            key: path.getAttribute(SOURCE_LINK_KEY_ATTR) || path.id || `link-${previews.length}`,
            color: edgeStroke(path),
            points,
        });
    }
    return previews;
}

function pathPointsInOverlay(path: SVGPathElement, host: HTMLElement): OverlayPt[] {
    const ctm = path.getScreenCTM();
    if (!ctm) {
        return [];
    }
    const points: OverlayPt[] = [];
    const re = /[ML]\s*(-?[\d.eE+-]+)(?:[,\s]+)(-?[\d.eE+-]+)/gi;
    const d = path.getAttribute('d') ?? '';
    let match: RegExpExecArray | null;
    while ((match = re.exec(d))) {
        const x = Number(match[1]);
        const y = Number(match[2]);
        const screen = new DOMPoint(x, y).matrixTransform(ctm);
        points.push(clientPointInOverlay(host, screen.x, screen.y));
    }
    return points;
}

function edgeStroke(path: SVGPathElement): string {
    const stroke = getComputedStyle(path).stroke;
    if (!stroke || stroke === 'none') {
        return 'var(--foreground)';
    }
    return stroke;
}

function orthogonalEdgeD(path: SVGPathElement, fromEl: Element | undefined, toEl: Element | undefined): string | null {
    if (!fromEl || !toEl) {
        return null;
    }
    const from = boxInPathSpace(fromEl, path);
    const to = boxInPathSpace(toEl, path);
    if (!from || !to) {
        return null;
    }
    const points = orthogonalRoute(from, to);
    if (points.length < 2) {
        return null;
    }
    return pointsToPathD(points);
}

function boxInPathSpace(node: Element, path: SVGPathElement): GuideBox | null {
    const ctm = path.getScreenCTM();
    if (!ctm) {
        return null;
    }
    const rect = node.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
        return null;
    }
    try {
        const inv = ctm.inverse();
        const a = new DOMPoint(rect.left, rect.top).matrixTransform(inv);
        const b = new DOMPoint(rect.right, rect.bottom).matrixTransform(inv);
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        return { x, y, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
    }
    catch {
        return null;
    }
}

function offsetOf(id: string, nodes: Record<string, MmdNodePos>, originById: Record<string, MmdNodePos>): MmdNodeOffset {
    const stored = nodes[id];
    const origin = originById[id];
    if (!stored || !origin) {
        return { dx: 0, dy: 0 };
    }
    return { dx: stored.x - origin.x, dy: stored.y - origin.y };
}

function snapshotOriginTransform(el: Element) {
    if (!el.hasAttribute(MMD_ORIGIN_TRANSFORM)) {
        el.setAttribute(MMD_ORIGIN_TRANSFORM, el.getAttribute('transform') ?? '');
    }
}

function snapshotOriginD(el: Element) {
    if (!el.hasAttribute(MMD_ORIGIN_D)) {
        el.setAttribute(MMD_ORIGIN_D, el.getAttribute('d') ?? '');
    }
}

function restoreOrigin(el: Element): MmdNodePos {
    const ot = el.getAttribute(MMD_ORIGIN_TRANSFORM) ?? '';
    if (ot) {
        el.setAttribute('transform', ot);
    }
    else {
        el.removeAttribute('transform');
    }
    return parseTranslateAttr(ot);
}

function joinTransform(origin: string, dx: number, dy: number): string {
    const extra = `translate(${fmt(dx)}, ${fmt(dy)})`;
    return origin ? `${origin} ${extra}` : extra;
}

function fmt(n: number): string {
    return String(Math.round(n * 100) / 100);
}
