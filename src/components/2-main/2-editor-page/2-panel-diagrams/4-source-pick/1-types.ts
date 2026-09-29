export type PickPoint = {
    x: number;
    y: number;
};

/** Screen transform: flow point (x, y) maps to (tx + x * zoom, ty + y * zoom). */
export type ViewTransform = {
    tx: number;
    ty: number;
    zoom: number;
};

/** A block in flow space. `name` is the node id, not its label. */
export type NodePick = {
    key: string;
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
};

/** A connection in flow space. (dx, dy) is the direction the line leaves the source. */
export type EdgePick = {
    key: string;
    text: string;
    x: number;
    y: number;
    dx: number;
    dy: number;
};

export type MarkerShape = 'circle' | 'pill';

export type NodeMarker = {
    kind: 'node';
    id: string;
    name: string;
    shape: MarkerShape;
    center: PickPoint;
    corner: PickPoint;
};

export type EdgeMarker = {
    kind: 'edge';
    id: string;
    text: string;
    at: PickPoint;
};

export type PlacedMarker = NodeMarker | EdgeMarker;
