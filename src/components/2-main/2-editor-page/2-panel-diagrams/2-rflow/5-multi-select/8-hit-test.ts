import { type Rect } from '../../4-common/1-marking-rect/9-types';
import { rectsIntersect } from '../../4-common/1-marking-rect/9-types';

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

export function nodeIdsInFlowRect(nodes: HitNode[], rect: Rect): string[] {
    const ids: string[] = [];
    for (const node of nodes) {
        if (node.hidden || node.selectable === false || node.width <= 0 || node.height <= 0) {
            continue;
        }
        if (rectsIntersect(rect, node)) {
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

export function idsInScreenRect(nodes: HitNode[], edges: HitEdge[], screenRect: Rect, transform: FlowTransform) {
    const nodeIds = nodeIdsInFlowRect(nodes, screenRectToFlow(screenRect, transform));
    return {
        nodeIds,
        edgeIds: edgeIdsForNodes(edges, new Set(nodeIds)),
    };
}
