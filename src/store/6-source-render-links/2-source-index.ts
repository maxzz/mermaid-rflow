import type { CatalogEntry, SourceHit, SourceIndex, SvgElementKind } from './1-types';

const EDGE_LIKE = new Set<SvgElementKind>([
    'edge',
    'edge-label',
    'message',
    'class-relationship',
    'er-relationship',
]);

export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Drop a trailing `%%` comment, ignoring `%%` inside quotes. */
export function lineWithoutComment(line: string): string {
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i]!;
        if (ch === "'" && !inDouble) {
            inSingle = !inSingle;
        } else if (ch === '"' && !inSingle) {
            inDouble = !inDouble;
        } else if (!inSingle && !inDouble && ch === '%' && line[i + 1] === '%') {
            return line.slice(0, i);
        }
    }
    return line;
}

/**
 * First identifier-bounded occurrence. `A` does not match `A1` or `us-east`.
 * A trailing `-` is allowed (Mermaid arrows: `A-->`, `Alice->>`) unless it continues a hyphenated id.
 * Returns 0-based offsets.
 */
export function findToken(text: string, token: string): { start: number; end: number; } | null {
    if (!token) {
        return null;
    }
    const re = new RegExp(`(?<![\\w-])${escapeRegExp(token)}(?![\\w])(?!-[\\w])`);
    const match = re.exec(text);
    if (!match) {
        return null;
    }
    return { start: match.index, end: match.index + token.length };
}

export function buildSourceIndex(source: string, catalog: CatalogEntry[]): SourceIndex {
    const lines = source.split('\n');
    const keyToHits = new Map<string, SourceHit[]>();
    const lineToKeys = new Map<number, string[]>();

    for (const entry of catalog) {
        const hits: SourceHit[] = [];
        for (let i = 0; i < lines.length; i++) {
            const text = lineWithoutComment(lines[i]!);
            const span = matchEntryOnLine(text, entry);
            if (!span) {
                continue;
            }
            hits.push({
                ...entry,
                line: i + 1,
                startCol: span.startCol,
                endCol: span.endCol,
                isDefinition: isDefinition(text, entry, span.startCol - 1),
            });
            addLineKey(lineToKeys, i + 1, entry.key);
        }
        hits.sort(compareHits);
        if (hits.length) {
            keyToHits.set(entry.key, hits);
        }
    }

    return { keyToHits, lineToKeys };
}

export function compareHits(a: SourceHit, b: SourceHit): number {
    if (a.isDefinition !== b.isDefinition) {
        return a.isDefinition ? -1 : 1;
    }
    return a.line - b.line;
}

function addLineKey(map: Map<number, string[]>, line: number, key: string) {
    const list = map.get(line);
    if (!list) {
        map.set(line, [key]);
        return;
    }
    if (!list.includes(key)) {
        list.push(key);
    }
}

function matchEntryOnLine(text: string, entry: CatalogEntry): { startCol: number; endCol: number; } | null {
    if (entry.kind === 'note') {
        return matchNote(text, entry);
    }

    if (EDGE_LIKE.has(entry.kind)) {
        const fromId = entry.ids[0] ?? '';
        const toId = entry.ids[1] ?? '';
        if (fromId && fromId === toId) {
            const self = findToken(text, fromId);
            return self ? { startCol: self.start + 1, endCol: self.end + 1 } : null;
        }
        const from = findToken(text, fromId);
        const to = findToken(text, toId);
        // Require source-order so `D --> B` does not match `edge:B>D`.
        if (!from || !to || from.start > to.start) {
            return null;
        }
        return {
            startCol: from.start + 1,
            endCol: to.end + 1,
        };
    }

    const id = entry.ids[0];
    if (!id) {
        return null;
    }
    const token = findToken(text, id);
    if (!token) {
        return null;
    }
    return { startCol: token.start + 1, endCol: token.end + 1 };
}

function matchNote(text: string, entry: CatalogEntry): { startCol: number; endCol: number; } | null {
    const hasNoteKw = /\bNote\b/i.test(text);
    const actorHit = entry.ids.map((id) => findToken(text, id)).find(Boolean) ?? null;
    if (hasNoteKw && actorHit) {
        return { startCol: actorHit.start + 1, endCol: actorHit.end + 1 };
    }
    if (entry.label) {
        const idx = text.indexOf(entry.label);
        if (idx >= 0) {
            return { startCol: idx + 1, endCol: idx + entry.label.length + 1 };
        }
    }
    return null;
}

function isDefinition(text: string, entry: CatalogEntry, tokenStart: number): boolean {
    const id = entry.ids[0];
    if (!id) {
        return false;
    }
    const prefix = text.slice(0, tokenStart);

    switch (entry.kind) {
        case 'node':
        case 'subgraph': {
            const after = text.slice(tokenStart + id.length);
            if (/^\s*[\[\(\{>]/.test(after)) {
                return true;
            }
            return /^\s*subgraph\s+$/i.test(prefix);
        }
        case 'actor':
        case 'lifeline':
        case 'activation':
            return /(?:participant|actor)\s+$/i.test(prefix);
        case 'class-node':
            return /class\s+$/i.test(prefix) || /^\s*$/.test(prefix);
        case 'entity':
        case 'block':
            return /^\s*$/.test(prefix);
        default:
            return false;
    }
}
