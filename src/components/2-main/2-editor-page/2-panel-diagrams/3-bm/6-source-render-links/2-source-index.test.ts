import { describe, expect, it } from 'vitest';
import type { CatalogEntry } from './1-types';
import { buildSourceIndex, findToken, lineWithoutComment } from './2-source-index';

const FLOWCHART = `\
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Ship it]
    B -->|No| D[Debug]
    D --> B
    C --> E[Celebrate]
`;

const flowchartCatalog: CatalogEntry[] = [
    { key: 'node:A', kind: 'node', ids: ['A'] },
    { key: 'node:B', kind: 'node', ids: ['B'] },
    { key: 'node:C', kind: 'node', ids: ['C'] },
    { key: 'node:D', kind: 'node', ids: ['D'] },
    { key: 'node:E', kind: 'node', ids: ['E'] },
    { key: 'edge:A>B', kind: 'edge', ids: ['A', 'B'] },
    { key: 'edge:B>C:Yes', kind: 'edge', ids: ['B', 'C'], label: 'Yes' },
    { key: 'edge:B>D:No', kind: 'edge', ids: ['B', 'D'], label: 'No' },
    { key: 'edge:D>B', kind: 'edge', ids: ['D', 'B'] },
    { key: 'edge:C>E', kind: 'edge', ids: ['C', 'E'] },
];

describe('findToken', () => {
    it('does not match A inside A1', () => {
        expect(findToken('    A1[A1]', 'A')).toBeNull();
        expect(findToken('    A1[A1]', 'A1')).toEqual({ start: 4, end: 6 });
    });

    it('matches a bare identifier with hyphen', () => {
        expect(findToken('    us-east[East]', 'us-east')).toEqual({ start: 4, end: 11 });
        expect(findToken('    us-east[East]', 'us')).toBeNull();
    });

    it('matches an id before a Mermaid arrow', () => {
        expect(findToken('    Alice->>Bob: Hello', 'Alice')).toEqual({ start: 4, end: 9 });
        expect(findToken('    A-->B', 'A')).toEqual({ start: 4, end: 5 });
    });
});

describe('lineWithoutComment', () => {
    it('strips a trailing %% comment', () => {
        expect(lineWithoutComment('    A[Start] %% mention A1')).toBe('    A[Start] ');
    });

    it('keeps %% inside quotes', () => {
        expect(lineWithoutComment('    A["100%% done"]')).toBe('    A["100%% done"]');
    });
});

describe('buildSourceIndex', () => {
    const index = buildSourceIndex(FLOWCHART, flowchartCatalog);

    it('prefers the shape definition for a node click', () => {
        const hits = index.keyToHits.get('node:A');
        expect(hits?.[0]).toMatchObject({ line: 2, isDefinition: true, startCol: 5, endCol: 6 });
    });

    it('maps a definition line to the node, its partner, and the edge', () => {
        expect(index.lineToKeys.get(2)).toEqual(['node:A', 'node:B', 'edge:A>B']);
    });

    it('requires both endpoints in source order before attaching an edge to a line', () => {
        expect(index.lineToKeys.get(5)).toEqual(['node:B', 'node:D', 'edge:D>B']);
        expect(index.lineToKeys.get(5)).not.toContain('edge:A>B');
        expect(index.lineToKeys.get(5)).not.toContain('edge:B>D:No');
    });

    it('ignores tokens that only appear in comments', () => {
        const source = `graph TD\n    A[Start] %% A1 is not a node\n    A1[Other]\n`;
        const catalog: CatalogEntry[] = [
            { key: 'node:A', kind: 'node', ids: ['A'] },
            { key: 'node:A1', kind: 'node', ids: ['A1'] },
        ];
        const result = buildSourceIndex(source, catalog);
        expect(result.lineToKeys.get(2)).toEqual(['node:A']);
        expect(result.keyToHits.get('node:A1')?.[0]?.line).toBe(3);
    });

    it('ranks a participant line as the actor definition', () => {
        const source = `sequenceDiagram\n    participant Alice\n    Alice->>Bob: Hello\n`;
        const catalog: CatalogEntry[] = [
            { key: 'actor:Alice', kind: 'actor', ids: ['Alice'] },
            { key: 'message:Alice>Bob:Hello', kind: 'message', ids: ['Alice', 'Bob'], label: 'Hello' },
        ];
        const result = buildSourceIndex(source, catalog);
        expect(result.keyToHits.get('actor:Alice')?.[0]).toMatchObject({ line: 2, isDefinition: true });
        expect(result.lineToKeys.get(3)).toEqual(['actor:Alice', 'message:Alice>Bob:Hello']);
    });
});
