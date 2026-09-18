import { proxy, ref } from 'valtio';
import type { LinkIntensity, RevealRange, SourceHit, SourceIndex, SourceLinkState } from './1-types';
import { compareHits } from './2-source-index';

export const sourceLink = proxy<SourceLinkState>({
    keys: [],
    origin: null,
    intensity: 'caret',
    focusLine: null,
    reveal: null,
    index: null,
});

export function setSourceIndex(index: SourceIndex | null) {
    sourceLink.index = index ? ref(index) : null;
    if (!index) {
        clearSelection();
        return;
    }
    if (sourceLink.origin === 'editor' && sourceLink.focusLine != null) {
        sourceLink.keys = index.lineToKeys.get(sourceLink.focusLine) ?? [];
        return;
    }
    const valid = new Set(index.keyToHits.keys());
    const next = sourceLink.keys.filter((key) => valid.has(key));
    if (next.length !== sourceLink.keys.length) {
        sourceLink.keys = next;
        if (!next.length) {
            sourceLink.origin = null;
            sourceLink.focusLine = null;
            sourceLink.reveal = null;
        }
    }
}

export function selectFromEditor(keys: string[], intensity: LinkIntensity, line: number) {
    if (
        sourceLink.origin === 'editor'
        && sourceLink.intensity === intensity
        && sourceLink.focusLine === line
        && sourceLink.reveal === null
        && sameKeys(sourceLink.keys, keys)
    ) {
        return;
    }
    sourceLink.keys = keys;
    sourceLink.origin = 'editor';
    sourceLink.intensity = intensity;
    sourceLink.focusLine = line;
    sourceLink.reveal = null;
}

export function selectFromDiagram(keys: string[]) {
    const reveal = bestReveal(keys, sourceLink.index);
    sourceLink.keys = keys;
    sourceLink.origin = 'diagram';
    sourceLink.intensity = 'click';
    sourceLink.focusLine = reveal?.line ?? null;
    sourceLink.reveal = reveal;
}

export function clearReveal() {
    sourceLink.reveal = null;
}

export function clearSelection() {
    sourceLink.keys = [];
    sourceLink.origin = null;
    sourceLink.intensity = 'caret';
    sourceLink.focusLine = null;
    sourceLink.reveal = null;
}

export function clearSourceLink() {
    clearSelection();
    sourceLink.index = null;
}

function bestReveal(keys: string[], index: SourceIndex | null): RevealRange | null {
    if (!index) {
        return null;
    }
    let best: SourceHit | null = null;
    for (const key of keys) {
        const hit = index.keyToHits.get(key)?.[0];
        if (!hit) {
            continue;
        }
        if (!best || compareHits(hit, best) < 0) {
            best = hit;
        }
    }
    if (!best) {
        return null;
    }
    return { line: best.line, startCol: best.startCol, endCol: best.endCol };
}

function sameKeys(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((key, i) => key === b[i]);
}
