import type { EdgeLabelPlace, EdgeMarker, EdgePick, NodeMarker, NodePick, ViewTransform } from './1-types';
import { markerShape } from './2-marker-shape';

/** Screen pixels from the source handle to the caption, then between stacked captions. */
const EDGE_ALONG_PX = 6;
const EDGE_LANE_PX = 32;

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

/**
 * Anchor at the start of the stroke. The caption hangs to the left of that point
 * (above, when the line leaves sideways) so it sits beside the line.
 */
export function placeEdgeMarker(edge: EdgePick, view: ViewTransform, lane = 0): EdgeMarker {
    const x = view.tx + edge.x * view.zoom;
    const y = view.ty + edge.y * view.zoom;
    const len = Math.hypot(edge.dx, edge.dy) || 1;
    const ux = edge.dx / len;
    const uy = edge.dy / len;
    const along = EDGE_ALONG_PX + lane * EDGE_LANE_PX;
    return {
        kind: 'edge',
        id: edge.key,
        text: edge.text,
        place: edgeLabelPlace(edge),
        at: {
            x: x + ux * along,
            y: y + uy * along,
        },
    };
}

/** One connection is marked at a time, so the caption always takes the left side of the stroke. */
export function edgeLabelPlace(edge: Pick<EdgePick, 'dx' | 'dy'>): EdgeLabelPlace {
    const vertical = Math.abs(edge.dy) >= Math.abs(edge.dx);
    if (vertical) {
        return edge.dy >= 0 ? 'down-left' : 'up-left';
    }
    return edge.dx >= 0 ? 'right-above' : 'left-above';
}
