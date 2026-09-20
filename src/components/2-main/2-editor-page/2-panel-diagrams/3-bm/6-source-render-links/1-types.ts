export type LinkIntensity = 'caret' | 'click';
export type LinkOrigin = 'editor' | 'diagram';

export type SvgElementKind =
    | 'node'
    | 'subgraph'
    | 'edge'
    | 'edge-label'
    | 'actor'
    | 'lifeline'
    | 'activation'
    | 'message'
    | 'block'
    | 'note'
    | 'class-node'
    | 'class-relationship'
    | 'entity'
    | 'er-relationship';

export type CatalogEntry = {
    key: string;
    kind: SvgElementKind;
    ids: string[];
    label?: string;
};

export type SourceHit = CatalogEntry & {
    line: number;       // 1-based
    startCol: number;   // 1-based
    endCol: number;
    isDefinition: boolean;
};

export type SourceIndex = {
    keyToHits: Map<string, SourceHit[]>;
    lineToKeys: Map<number, string[]>;
};

export type RevealRange = {
    line: number;
    startCol: number;
    endCol: number;
};

export type SourceLinkState = {
    keys: string[];
    origin: LinkOrigin | null;
    intensity: LinkIntensity;
    focusLine: number | null;
    reveal: RevealRange | null;
    index: SourceIndex | null;
};
