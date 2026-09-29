import type { EdgeLabelPlace, EdgeMarker, EdgePick, NodeMarker, NodePick, ViewTransform } from './1-types';
import { markerShape } from './2-marker-shape';

/** Screen pixels from the source handle to the caption, then between stacked captions. */
const EDGE_ALONG_PX = 6;
const EDGE_LANE_PX = 32;
/** Ignore a bend smaller than this (flow px) and keep the caption on the default side. */
const BEND_PX = 8;

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
 * Anchor at the start of the stroke. The caption hangs off that point on the open
 * side, so its box sits beside the line instead of across it.
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

export function edgeLabelPlace(edge: Pick<EdgePick, 'x' | 'y' | 'dx' | 'dy' | 'towardX' | 'towardY'>): EdgeLabelPlace {
    const vertical = Math.abs(edge.dy) >= Math.abs(edge.dx);
    const bendX = (edge.towardX ?? edge.x + edge.dx) - edge.x;
    const bendY = (edge.towardY ?? edge.y + edge.dy) - edge.y;
    if (vertical) {
        const down = edge.dy >= 0;
        const right = bendX < -BEND_PX;
        if (down) {
            return right ? 'down-right' : 'down-left';
        }
        return right ? 'up-right' : 'up-left';
    }
    const forward = edge.dx >= 0;
    const below = bendY < -BEND_PX;
    if (forward) {
        return below ? 'right-below' : 'right-above';
    }
    return below ? 'left-below' : 'left-above';
}
