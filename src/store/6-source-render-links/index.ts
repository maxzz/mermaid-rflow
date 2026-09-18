export type {
    CatalogEntry,
    LinkIntensity,
    LinkOrigin,
    RevealRange,
    SourceHit,
    SourceIndex,
    SourceLinkState,
    SvgElementKind,
} from './1-types';

export { buildSourceIndex, compareHits, escapeRegExp, findToken, lineWithoutComment } from './2-source-index';

export {
    addHitStrokes,
    catalogSvg,
    closestTagged,
    SOURCE_LINK_HIT_ATTR,
    SOURCE_LINK_KEY_ATTR,
    TAGGED_SELECTOR,
} from './3-svg-catalog';

export {
    clearReveal,
    clearSelection,
    clearSourceLink,
    selectFromDiagram,
    selectFromEditor,
    setSourceIndex,
    sourceLink,
} from './4-source-link';
