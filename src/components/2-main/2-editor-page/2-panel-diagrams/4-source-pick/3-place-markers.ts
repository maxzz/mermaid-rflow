import type { EdgeMarker, EdgePick, NodeMarker, NodePick, ViewTransform } from './1-types';
import { markerShape } from './2-marker-shape';

const EDGE_ALONG_PX = 12;
const EDGE_SIDE_PX = 16;
const EDGE_LANE_PX = 22;

export function placeNodeMarker(node: NodePick, view: ViewTransform): NodeMarker {
    const name = node.name.trim() || node.key;
    const zoom = view.zoom;
    return {
        kind: 'node',
        id: node.key,
        name,
        shape: markerShape(name),
        center: {
            x: view.tx + (node.x + node.w / 2) * zoom,
            y: view.ty + (node.y + node.h / 2) * zoom,
        },
        corner: {
            x: view.tx + node.x * zoom,
            y: view.ty + node.y * zoom,
        },
    };
}

/** Screen point just beside the start of the connection, so the caption clears the stroke. */
export function placeEdgeMarker(edge: EdgePick, view: ViewTransform, lane = 0): EdgeMarker {
    const x = view.tx + edge.x * view.zoom;
    const y = view.ty + edge.y * view.zoom;
    const len = Math.hypot(edge.dx, edge.dy) || 1;
    const ux = edge.dx / len;
    const uy = edge.dy / len;
    const side = EDGE_SIDE_PX + lane * EDGE_LANE_PX;
    return {
        kind: 'edge',
        id: edge.key,
        text: edge.text,
        at: {
            x: x + ux * EDGE_ALONG_PX - uy * side,
            y: y + uy * EDGE_ALONG_PX + ux * side,
        },
    };
}
