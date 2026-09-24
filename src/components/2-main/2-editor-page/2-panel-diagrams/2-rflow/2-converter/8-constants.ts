//---------------------------------------------------------------------------
// Layout spacing.

export const LAYOUT_SPACING = {
    SUBGRAPH_HEADER_HEIGHT: 35,
    SUBGRAPH_PADDING: 8,
    SUBGRAPH_CONTENT_TOP_MARGIN: 10,
    NODE_SEPARATION_HORIZONTAL: 80,
    NODE_SEPARATION_VERTICAL: 100,
    CONTAINER_SEPARATION_HORIZONTAL: 120,
    CONTAINER_SEPARATION_VERTICAL: 160,
    NESTED_SUBGRAPH_SEPARATION_HORIZONTAL: 120,
    NESTED_SUBGRAPH_SEPARATION_VERTICAL: 140,
    META_GRAPH_MARGIN: 100,
    NESTED_CONTENT_MARGIN: 40,
    MIXED_CONTENT_VERTICAL_SPACING: 100,
    MIXED_CONTENT_HORIZONTAL_SPACING: 120,
} as const;

//---------------------------------------------------------------------------
// Alignment types.

export const ALIGNMENT_TYPES = {
    LEFT: 'left',
    RIGHT: 'right',
    TOP: 'top',
    BOTTOM: 'bottom',
    CENTER_HORIZONTAL: 'center-horizontal',
    CENTER_VERTICAL: 'center-vertical',
} as const;

export type AlignmentType = typeof ALIGNMENT_TYPES[keyof typeof ALIGNMENT_TYPES];

//---------------------------------------------------------------------------
// Distribution types.

export const DISTRIBUTION_TYPES = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical',
} as const;

export type DistributionType = typeof DISTRIBUTION_TYPES[keyof typeof DISTRIBUTION_TYPES];

//---------------------------------------------------------------------------
// Layout directions.

export const LAYOUT_DIRECTIONS = {
    TOP_TO_BOTTOM: 'TB',
    BOTTOM_TO_TOP: 'BT',
    LEFT_TO_RIGHT: 'LR',
    RIGHT_TO_LEFT: 'RL',
} as const;

export type LayoutDirection = typeof LAYOUT_DIRECTIONS[keyof typeof LAYOUT_DIRECTIONS];

//---------------------------------------------------------------------------
// Node shapes.

export const NODE_SHAPES = {
    RECTANGLE: 'rect',
    DIAMOND: 'diamond',
    CIRCLE: 'circle',
    STADIUM: 'stadium',
    ROUND: 'round',
} as const;

export type NodeShape = typeof NODE_SHAPES[keyof typeof NODE_SHAPES];

//---------------------------------------------------------------------------
// Node shape colors.

export const NODE_SHAPE_COLORS = {
    [NODE_SHAPES.RECTANGLE]: ['#E3F2FD', '#1976D2'],
    [NODE_SHAPES.DIAMOND]: ['#FFF3E0', '#F57C00'],
    [NODE_SHAPES.CIRCLE]: ['#E8F5E8', '#388E3C'],
    [NODE_SHAPES.STADIUM]: ['#F3E5F5', '#7B1FA2'],
    [NODE_SHAPES.ROUND]: ['#FCE4EC', '#C2185B'],
} as const;

export const COLOR_PRESETS = {
    background: [
        'transparent',
        '#ffffff',
        '#f8fafc',
        '#fde68a',
        '#bfdbfe',
        '#fecaca',
        '#d1fae5',
        '#ddd6fe',
    ],
    border: [
        'transparent',
        '#222222',
        '#000000',
        '#64748b',
        '#fb7185',
        '#f59e0b',
        '#34d399',
        '#7c3aed',
    ],
};

export const DEFAULT_COLORS = {
    background: '#ffffff',
    border: '#222222',
    icon: '#000000',
};
