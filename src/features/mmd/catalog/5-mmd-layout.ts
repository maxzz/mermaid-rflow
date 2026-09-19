import { SOURCE_LINK_HIT_ATTR } from '@/store/6-source-render-links';
import { edgeEndpointsFromDomId, mermaidIdFromDomId } from './3-catalog-mmd';

export type MmdNodePos = { x: number; y: number; };
export type MmdNodeOffset = { dx: number; dy: number; };

export const MMD_ORIGIN_TRANSFORM = 'data-mmd-ot';
export const MMD_ORIGIN_D = 'data-mmd-od';

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

export function clientDeltaToSvg(svg: SVGSVGElement, dx: number, dy: number): MmdNodeOffset {
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const width = vb.width || svg.width.baseVal.value || rect.width;
    const height = vb.height || svg.height.baseVal.value || rect.height;
    if (rect.width === 0 || rect.height === 0) {
        return { dx, dy };
    }
    return {
        dx: dx * (width / rect.width),
        dy: dy * (height / rect.height),
    };
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
