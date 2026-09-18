/**
 * beautiful-mermaid / ELK treat diamonds as rectangles, then bundle every
 * outgoing (and often the loop-back) onto the bottom vertex. Rewrite those
 * polylines so a decision node behaves like a flowchart diamond:
 * incoming + re-check enter at the top; Yes / No leave opposite sides.
 */

export type FlowDirection = 'TD' | 'BT' | 'LR' | 'RL';
export type Compass = 'n' | 'e' | 's' | 'w';

export function detectGraphDirection(source: string): FlowDirection {
    const lines = source.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('%%'));
    let i = 0;
    if (lines[0] === '---') {
        i = lines.indexOf('---', 1) + 1;
        if (i <= 0) {
            i = 1;
        }
    }
    const header = lines[i] ?? '';
    const m = header.match(/^(?:graph|flowchart)\s+(TD|TB|LR|RL|BT)\b/i);
    if (!m) {
        return 'TD';
    }
    const dir = m[1].toUpperCase();
    return dir === 'TB' ? 'TD' : dir as FlowDirection;
}

//---------------------------------------------------------------------------

export type Point = { x: number; y: number; };

export type NodeBox = {
    id: string;
    shape: string;
    x: number;
    y: number;
    w: number;
    h: number;
};

export function boxCenter(box: NodeBox): Point {
    return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

export function vertex(box: NodeBox, side: Compass): Point {
    const c = boxCenter(box);
    switch (side) {
        case 'n': return { x: c.x, y: box.y };
        case 's': return { x: c.x, y: box.y + box.h };
        case 'e': return { x: box.x + box.w, y: c.y };
        case 'w': return { x: box.x, y: c.y };
    }
}

export function incomingPort(direction: FlowDirection): Compass {
    switch (direction) {
        case 'BT': return 's';
        case 'LR': return 'w';
        case 'RL': return 'e';
        default: return 'n';
    }
}

/** Left-hand / right-hand exits when looking along the flow. */
export function outgoingPorts(direction: FlowDirection): [Compass, Compass] {
    switch (direction) {
        case 'BT': return ['e', 'w'];
        case 'LR': return ['n', 's'];
        case 'RL': return ['s', 'n'];
        default: return ['w', 'e'];
    }
}

//---------------------------------------------------------------------------

export type EdgeRef = {
    from: string;
    to: string;
    label?: string;
    points: Point[];
};

export function classifyOutgoingSides(diamond: NodeBox, edges: EdgeRef[], nodes: Map<string, NodeBox>, direction: FlowDirection): Compass[] {
    const [leftPort, rightPort] = outgoingPorts(direction);
    const labeled = edges.map((e) => {
        const label = (e.label ?? '').trim();
        if (YES_RE.test(label)) {
            return leftPort;
        }
        if (NO_RE.test(label)) {
            return rightPort;
        }
        return null;
    });

    if (labeled.every((s) => s !== null)) {
        return labeled as Compass[];
    }

    const flowAxis = direction === 'LR' || direction === 'RL' ? 'y' : 'x';
    const ranked = edges
        .map((e, i) => {
            const target = nodes.get(e.to);
            const pos = target ? (flowAxis === 'x' ? boxCenter(target).x : boxCenter(target).y) : 0;
            return { i, pos };
        })
        .sort((a, b) => a.pos - b.pos);

    const sides: Compass[] = edges.map(() => leftPort);
    if (edges.length === 1) {
        sides[0] = incomingPort(opposite(direction));
        return sides;
    }

    ranked.forEach((item, rank) => {
        if (rank === 0) {
            sides[item.i] = leftPort;
        } else if (rank === ranked.length - 1) {
            sides[item.i] = rightPort;
        } else {
            sides[item.i] = incomingPort(opposite(direction));
        }
    });

    labeled.forEach((side, i) => {
        if (side) {
            sides[i] = side;
        }
    });
    return sides;
}

function opposite(direction: FlowDirection): FlowDirection {
    switch (direction) {
        case 'BT': return 'TD';
        case 'LR': return 'RL';
        case 'RL': return 'LR';
        default: return 'BT';
    }
}

export function isBackEdge(source: NodeBox, diamond: NodeBox, direction: FlowDirection): boolean {
    const s = boxCenter(source);
    const d = boxCenter(diamond);
    switch (direction) {
        case 'BT': return s.y < d.y;
        case 'LR': return s.x > d.x;
        case 'RL': return s.x < d.x;
        default: return s.y > d.y;
    }
}

export function routeOutgoing(diamond: NodeBox, target: NodeBox, side: Compass, direction: FlowDirection): Point[] {
    const start = vertex(diamond, side);
    const enter = vertex(target, incomingPort(direction));
    return orthogonalVia(start, enter, side, direction);
}

export function routeIncoming(source: NodeBox, diamond: NodeBox, direction: FlowDirection): Point[] {
    const end = vertex(diamond, incomingPort(direction));
    if (!isBackEdge(source, diamond, direction)) {
        const start = vertex(source, incomingPort(opposite(direction)));
        return orthogonalJoin(start, end);
    }
    return routeLoopBack(source, diamond, end, direction);
}

function orthogonalVia(start: Point, end: Point, fromSide: Compass, direction: FlowDirection): Point[] {
    if (direction === 'LR' || direction === 'RL') {
        const midX = (start.x + end.x) / 2;
        if (fromSide === 'n' || fromSide === 's') {
            return uniquePoints([start, { x: start.x, y: end.y }, end]);
        }
        return uniquePoints([start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]);
    }

    const midY = (start.y + end.y) / 2;
    if (fromSide === 'w' || fromSide === 'e') {
        return uniquePoints([start, { x: start.x, y: midY }, { x: end.x, y: midY }, end]);
    }
    return uniquePoints([start, { x: end.x, y: start.y }, end]);
}

function orthogonalJoin(start: Point, end: Point): Point[] {
    if (nearly(start.x, end.x) || nearly(start.y, end.y)) {
        return uniquePoints([start, end]);
    }
    return uniquePoints([start, { x: end.x, y: start.y }, end]);
}

function routeLoopBack(source: NodeBox, diamond: NodeBox, end: Point, direction: FlowDirection): Point[] {
    const sc = boxCenter(source);
    const dc = boxCenter(diamond);

    if (direction === 'LR' || direction === 'RL') {
        const aroundY = sc.y >= dc.y
            ? Math.max(source.y + source.h, diamond.y + diamond.h) + GAP
            : Math.min(source.y, diamond.y) - GAP;
        const overX = direction === 'LR' ? diamond.x - GAP : diamond.x + diamond.w + GAP;
        const leave = { x: source.x + (direction === 'LR' ? source.w : 0), y: sc.y };
        return uniquePoints([
            leave,
            { x: leave.x, y: aroundY },
            { x: overX, y: aroundY },
            { x: overX, y: end.y },
            end,
        ]);
    }

    const leaveRight = sc.x >= dc.x;
    const aroundX = leaveRight
        ? Math.max(source.x + source.w, diamond.x + diamond.w) + GAP
        : Math.min(source.x, diamond.x) - GAP;
    const overY = direction === 'BT' ? diamond.y + diamond.h + GAP : diamond.y - GAP;
    const leave = { x: leaveRight ? source.x + source.w : source.x, y: sc.y };
    return uniquePoints([
        leave,
        { x: aroundX, y: leave.y },
        { x: aroundX, y: overY },
        { x: end.x, y: overY },
        end,
    ]);
}

function uniquePoints(points: Point[]): Point[] {
    const out: Point[] = [];
    for (const p of points) {
        const prev = out[out.length - 1];
        if (!prev || !nearly(prev.x, p.x) || !nearly(prev.y, p.y)) {
            out.push(p);
        }
    }
    return out;
}

function nearly(a: number, b: number): boolean {
    return Math.abs(a - b) < 0.5;
}

export function pathMidpoint(points: Point[]): Point {
    if (points.length === 0) {
        return { x: 0, y: 0 };
    }
    if (points.length === 1) {
        return points[0];
    }
    let total = 0;
    for (let i = 1; i < points.length; i++) {
        total += hypot(points[i - 1], points[i]);
    }
    let rest = total / 2;
    for (let i = 1; i < points.length; i++) {
        const len = hypot(points[i - 1], points[i]);
        if (rest <= len) {
            const t = len === 0 ? 0 : rest / len;
            return {
                x: points[i - 1].x + t * (points[i].x - points[i - 1].x),
                y: points[i - 1].y + t * (points[i].y - points[i - 1].y),
            };
        }
        rest -= len;
    }
    return points[points.length - 1];
}

function hypot(a: Point, b: Point): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
}

//---------------------------------------------------------------------------
// SVG rewrite

export function routeDiamondEdges(svg: string, direction: FlowDirection = 'TD'): string {
    const nodes = [...extractNodes(svg).values()];
    const diamonds = nodes.filter((n) => n.shape === 'diamond');
    if (diamonds.length === 0) {
        return svg;
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const edges = extractEdges(svg);
    const updates: { edge: EdgeRef; points: Point[]; }[] = [];

    for (const diamond of diamonds) {
        const outgoing = edges.filter((e) => e.from === diamond.id && e.to !== diamond.id);
        const incoming = edges.filter((e) => e.to === diamond.id && e.from !== diamond.id);
        const sides = classifyOutgoingSides(diamond, outgoing, nodeMap, direction);

        outgoing.forEach((edge, i) => {
            const target = nodeMap.get(edge.to);
            if (!target) {
                return;
            }
            updates.push({ edge, points: routeOutgoing(diamond, target, sides[i], direction) });
        });

        for (const edge of incoming) {
            const source = nodeMap.get(edge.from);
            if (!source) {
                continue;
            }
            updates.push({ edge, points: routeIncoming(source, diamond, direction) });
        }
    }

    if (updates.length === 0) {
        return svg;
    }

    let next = svg;
    let maxX = 0;
    let maxY = 0;

    for (const { edge, points } of updates) {
        next = replaceEdgePoints(next, edge, points);
        next = nudgeEdgeLabel(next, edge, pathMidpoint(edge.points), pathMidpoint(points));
        for (const p of points) {
            maxX = Math.max(maxX, p.x + GAP);
            maxY = Math.max(maxY, p.y + GAP);
        }
    }

    return expandSvgCanvas(next, maxX, maxY);
}

export function extractNodes(svg: string): Map<string, NodeBox> {
    const nodes = new Map<string, NodeBox>();
    const re = /<g\b[^>]*\bclass="node"[^>]*>([\s\S]*?)<\/g>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(svg))) {
        const tag = m[0].slice(0, m[0].indexOf('>') + 1);
        const id = attr(tag, 'data-id');
        const shape = attr(tag, 'data-shape') ?? 'rectangle';
        if (!id) {
            continue;
        }
        const box = shapeBox(m[1], shape);
        if (box) {
            nodes.set(id, { id, shape, ...box });
        }
    }
    return nodes;
}

export function extractEdges(svg: string): EdgeRef[] {
    const edges: EdgeRef[] = [];
    const re = /<polyline\b[^>]*\bclass="edge"[^>]*>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(svg))) {
        const tag = m[0];
        const from = attr(tag, 'data-from');
        const to = attr(tag, 'data-to');
        const points = parsePoints(attr(tag, 'points') ?? '');
        if (!from || !to || points.length < 2) {
            continue;
        }
        edges.push({ from, to, label: attr(tag, 'data-label'), points });
    }
    return edges;
}

function shapeBox(inner: string, shape: string): Omit<NodeBox, 'id' | 'shape'> | null {
    if (shape === 'diamond') {
        const pts = parsePoints(attr(inner, 'points') ?? '');
        if (pts.length < 4) {
            return null;
        }
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }

    const x = num(attr(inner, 'x'));
    const y = num(attr(inner, 'y'));
    const w = num(attr(inner, 'width'));
    const h = num(attr(inner, 'height'));
    if (w !== undefined && h !== undefined && w > 0 && h > 0) {
        return { x: x ?? 0, y: y ?? 0, w, h };
    }

    const cx = num(attr(inner, 'cx'));
    const cy = num(attr(inner, 'cy'));
    const r = num(attr(inner, 'r'));
    if (cx !== undefined && cy !== undefined && r !== undefined) {
        return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
    }
    return null;
}

function replaceEdgePoints(svg: string, edge: EdgeRef, points: Point[]): string {
    return svg.replace(/<polyline\b[^>]*\bclass="edge"[^>]*>/g, (tag) => {
        if (!sameEdge(tag, edge)) {
            return tag;
        }
        return tag.replace(/\bpoints="[^"]*"/, `points="${formatPoints(points)}"`);
    });
}

function nudgeEdgeLabel(svg: string, edge: EdgeRef, from: Point, to: Point): string {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        return svg;
    }
    return svg.replace(/<g\b[^>]*\bclass="edge-label"[^>]*>/g, (tag) => {
        if (!sameEdge(tag, edge)) {
            return tag;
        }
        if (/\btransform="/.test(tag)) {
            return tag.replace(/\btransform="([^"]*)"/, (_, prev) => `transform="${prev} translate(${fmt(dx)} ${fmt(dy)})"`);
        }
        return tag.replace(/>$/, ` transform="translate(${fmt(dx)} ${fmt(dy)})">`);
    });
}

function expandSvgCanvas(svg: string, maxX: number, maxY: number): string {
    return svg.replace(/<svg\b[^>]*>/, (tag) => {
        const width = num(attr(tag, 'width')) ?? 0;
        const height = num(attr(tag, 'height')) ?? 0;
        const vb = (attr(tag, 'viewBox') ?? '').split(/[\s,]+/).map(Number);
        const nextW = Math.max(width, vb[2] || 0, maxX);
        const nextH = Math.max(height, vb[3] || 0, maxY);
        if (nextW <= width && nextH <= height) {
            return tag;
        }
        let next = tag
            .replace(/\bwidth="[^"]*"/, `width="${fmt(nextW)}"`)
            .replace(/\bheight="[^"]*"/, `height="${fmt(nextH)}"`);
        if (vb.length === 4) {
            next = next.replace(/\bviewBox="[^"]*"/, `viewBox="${vb[0]} ${vb[1]} ${fmt(nextW)} ${fmt(nextH)}"`);
        }
        return next;
    });
}

function sameEdge(tag: string, edge: EdgeRef): boolean {
    return attr(tag, 'data-from') === edge.from
        && attr(tag, 'data-to') === edge.to
        && (attr(tag, 'data-label') ?? '') === (edge.label ?? '');
}

function attr(text: string, name: string): string | undefined {
    const m = text.match(new RegExp(`\\b${name}="([^"]*)"`));
    return m?.[1];
}

function num(value: string | undefined): number | undefined {
    if (value == null || value === '') {
        return undefined;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}

function parsePoints(value: string): Point[] {
    return value.trim().split(/\s+/).flatMap((pair) => {
        const [x, y] = pair.split(',').map(Number);
        return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : [];
    });
}

function formatPoints(points: Point[]): string {
    return points.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' ');
}

function fmt(n: number): string {
    return String(Math.round(n * 10) / 10);
}

const GAP = 20;
const YES_RE = /^(yes|true|y|ok)$/i;
const NO_RE = /^(no|false|n)$/i;
