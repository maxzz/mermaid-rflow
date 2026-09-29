import type { EdgePick, NodePick, PlacedMarker, ViewTransform } from '../1-types';
import { placeEdgeMarker, placeNodeMarker } from '../3-place-markers';

export type FlowHandle = {
    id?: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
    position: string;
};

export type MeasuredNode = {
    id: string;
    key: string;
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
    sourcePosition?: string;
    handles: FlowHandle[] | null;
};

export type MeasuredEdge = {
    key: string;
    text: string;
    sourceId: string;
    sourceHandle?: string | null;
};

type LineHit = {
    line: number;
    isDefinition: boolean;
};

export function definedBlockKeys(
    keys: readonly string[],
    line: number | null,
    hitsFor: (key: string) => readonly LineHit[] | undefined,
): Set<string> {
    const defined = new Set<string>();
    if (line == null) {
        return defined;
    }
    for (const key of keys) {
        const hits = hitsFor(key);
        if (hits?.some((hit) => hit.line === line && hit.isDefinition)) {
            defined.add(key);
        }
    }
    return defined;
}

/** Blocks that are declared on the line, plus every connection. Endpoint mentions stay unmarked. */
export function keysToMark(keys: readonly string[], defined: ReadonlySet<string>): { blocks: string[]; edges: string[]; } {
    const edges = unique(keys.filter((key) => key.startsWith('edge:')));
    const blocks = unique(keys.filter((key) => {
        if (!key.startsWith('node:') && !key.startsWith('subgraph:')) {
            return false;
        }
        if (defined.has(key)) {
            return true;
        }
        return edges.length === 0;
    }));
    return { blocks, edges };
}

export function edgeAnchor(node: Pick<MeasuredNode, 'x' | 'y' | 'w' | 'h' | 'sourcePosition' | 'handles'>, sourceHandle?: string | null): { x: number; y: number; dx: number; dy: number; } | null {
    if (node.w <= 0 || node.h <= 0) {
        return null;
    }
    const handles = node.handles ?? [];
    const handle = (sourceHandle ? handles.find((item) => item.id === sourceHandle) : undefined) ?? handles[0];
    if (handle) {
        const dir = outgoing(handle.position);
        return {
            x: node.x + handle.x + handle.width / 2,
            y: node.y + handle.y + handle.height / 2,
            dx: dir.dx,
            dy: dir.dy,
        };
    }
    const position = node.sourcePosition || 'bottom';
    return { ...sidePoint(node, position), ...outgoing(position) };
}

export function flowSourceMarkers(args: {
    keys: readonly string[];
    line: number | null;
    hitsFor: (key: string) => readonly LineHit[] | undefined;
    nodes: readonly MeasuredNode[];
    edges: readonly MeasuredEdge[];
    view: ViewTransform;
}): PlacedMarker[] {
    const defined = definedBlockKeys(args.keys, args.line, args.hitsFor);
    const { blocks, edges } = keysToMark(args.keys, defined);
    const nodeByKey = new Map(args.nodes.map((node) => [node.key, node]));
    const nodeById = new Map(args.nodes.map((node) => [node.id, node]));
    const markers: PlacedMarker[] = [];

    for (const key of blocks) {
        const node = nodeByKey.get(key);
        if (!node) {
            continue;
        }
        markers.push(placeNodeMarker(toNodePick(node), args.view));
    }

    let lane = 0;
    for (const key of edges) {
        const edge = args.edges.find((item) => item.key === key);
        const source = edge ? nodeById.get(edge.sourceId) : undefined;
        if (!edge || !source) {
            continue;
        }
        const anchor = edgeAnchor(source, edge.sourceHandle);
        if (!anchor) {
            continue;
        }
        const pick: EdgePick = { key: edge.key, text: edge.text, ...anchor };
        markers.push(placeEdgeMarker(pick, args.view, lane));
        lane += 1;
    }

    return markers;
}

function toNodePick(node: MeasuredNode): NodePick {
    return { key: node.key, name: node.name, x: node.x, y: node.y, w: node.w, h: node.h };
}

function unique(keys: string[]): string[] {
    return [...new Set(keys)];
}

function outgoing(position: string): { dx: number; dy: number; } {
    switch (position) {
        case 'top':
            return { dx: 0, dy: -1 };
        case 'left':
            return { dx: -1, dy: 0 };
        case 'right':
            return { dx: 1, dy: 0 };
        default:
            return { dx: 0, dy: 1 };
    }
}

function sidePoint(node: Pick<MeasuredNode, 'x' | 'y' | 'w' | 'h'>, position: string): { x: number; y: number; } {
    switch (position) {
        case 'top':
            return { x: node.x + node.w / 2, y: node.y };
        case 'left':
            return { x: node.x, y: node.y + node.h / 2 };
        case 'right':
            return { x: node.x + node.w, y: node.y + node.h / 2 };
        default:
            return { x: node.x + node.w / 2, y: node.y + node.h };
    }
}
