import { rectContains, rectsIntersect, type Rect } from '../../../../../../ui/local-ui/1-marking-rect';

export type HitNode = Rect & {
    id: string;
    selectable?: boolean;
    hidden?: boolean;
};

export type HitEdge = {
    id: string;
    source: string;
    target: string;
    selectable?: boolean;
};

export type FlowTransform = {
    x: number;
    y: number;
    zoom: number;
};

/** Pane pixels to flow coordinates. `transform` is React Flow's viewport (pan x, pan y, zoom). */
export function screenRectToFlow(rect: Rect, transform: FlowTransform): Rect {
    const zoom = transform.zoom || 1;
    return {
        x: (rect.x - transform.x) / zoom,
        y: (rect.y - transform.y) / zoom,
        width: rect.width / zoom,
        height: rect.height / zoom,
    };
}

/** `overlap` counts any shared area. `inside` counts a node only when the rectangle covers it completely. */
export type RectFit = 'overlap' | 'inside';

export function nodeIdsInFlowRect(nodes: HitNode[], rect: Rect, fit: RectFit = 'overlap'): string[] {
    const ids: string[] = [];
    for (const node of nodes) {
        if (node.hidden || node.selectable === false || node.width <= 0 || node.height <= 0) {
            continue;
        }
        const hit = fit === 'inside' ? rectContains(rect, node) : rectsIntersect(rect, node);
        if (hit) {
            ids.push(node.id);
        }
    }
    return ids;
}

/** Edges whose two ends are both inside the node selection. */
export function edgeIdsForNodes(edges: HitEdge[], nodeIds: ReadonlySet<string>): string[] {
    const ids: string[] = [];
    for (const edge of edges) {
        if (edge.selectable === false) {
            continue;
        }
        if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
            ids.push(edge.id);
        }
    }
    return ids;
}

export function idsInScreenRect(nodes: HitNode[], edges: HitEdge[], screenRect: Rect, transform: FlowTransform, fit: RectFit = 'overlap') {
    const nodeIds = nodeIdsInFlowRect(nodes, screenRectToFlow(screenRect, transform), fit);
    return {
        nodeIds,
        edgeIds: edgeIdsForNodes(edges, new Set(nodeIds)),
    };
}
