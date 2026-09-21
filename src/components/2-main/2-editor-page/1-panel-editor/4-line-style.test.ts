import { describe, expect, it } from 'vitest';
import {
    extraStyleDecls,
    formatStyleDirectiveLine,
    LINK_STYLE_FIELDS,
    NODE_STYLE_FIELDS,
    parseStyleDirectiveLine,
    patchStyleDirectiveAtLine,
    readStyleDirectiveAt,
    resolveStyleDirective,
    setStyleDecl,
    setStyleInterpolate,
} from './4-line-style';

const FLOW = `\
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Ship it]
    B -->|No| D[Debug]
    D --> B
    C --> E[Celebrate]
    style A fill:#16a34a,stroke:#16a34a,stroke-dasharray:8 4
    linkStyle 0 stroke:#0c2026,stroke-dasharray:8 4
    style D fill:#2563eb,stroke:#2563eb
`;

describe('parseStyleDirectiveLine', () => {
    it('reads a node style line with fill, stroke, and dash', () => {
        const parsed = parseStyleDirectiveLine('    style A fill:#16a34a,stroke:#16a34a,stroke-dasharray:8 4');
        expect(parsed).toMatchObject({
            kind: 'style',
            indent: '    ',
            targetsRaw: 'A',
            ids: ['A'],
            isDefault: false,
            decls: {
                fill: '#16a34a',
                stroke: '#16a34a',
                'stroke-dasharray': '8 4',
            },
            comment: '',
        });
    });

    it('reads linkStyle with an edge index', () => {
        const parsed = parseStyleDirectiveLine('    linkStyle 0 stroke:#0c2026,stroke-dasharray:8 4');
        expect(parsed).toMatchObject({
            kind: 'linkStyle',
            targetsRaw: '0',
            indices: [0],
            decls: {
                stroke: '#0c2026',
                'stroke-dasharray': '8 4',
            },
        });
    });

    it('reads interpolate plus CSS on linkStyle', () => {
        const parsed = parseStyleDirectiveLine('linkStyle 1,2 interpolate cardinal stroke:#ff3,stroke-width:4px,color:red;');
        expect(parsed).toMatchObject({
            kind: 'linkStyle',
            indices: [1, 2],
            interpolate: 'cardinal',
            decls: {
                stroke: '#ff3',
                'stroke-width': '4px',
                color: 'red',
            },
        });
    });

    it('keeps a trailing comment and default targets', () => {
        const parsed = parseStyleDirectiveLine('style default fill:#f9f %% note');
        expect(parsed).toMatchObject({
            kind: 'style',
            isDefault: true,
            ids: ['default'],
            decls: { fill: '#f9f' },
            comment: ' %% note',
        });
    });

    it('keeps escaped commas and rgb() values in decls', () => {
        const parsed = parseStyleDirectiveLine('style A fill:rgb(0, 128, 0),stroke-dasharray:5\\,5');
        expect(parsed?.decls).toEqual({
            fill: 'rgb(0, 128, 0)',
            'stroke-dasharray': '5,5',
        });
    });

    it('returns null for ordinary flowchart lines', () => {
        expect(parseStyleDirectiveLine('    A[Start] --> B{Is it working?}')).toBeNull();
        expect(parseStyleDirectiveLine('    classDef foo fill:#f96')).toBeNull();
    });
});

describe('formatStyleDirectiveLine / patchStyleDirectiveAtLine', () => {
    it('round-trips a typical node style line', () => {
        const raw = '    style D fill:#2563eb,stroke:#2563eb';
        expect(formatStyleDirectiveLine(parseStyleDirectiveLine(raw)!)).toBe(raw);
    });

    it('writes interpolate back in front of decls', () => {
        const parsed = parseStyleDirectiveLine('linkStyle default interpolate basis')!;
        const next = setStyleDecl(parsed, 'stroke', '#ff3');
        expect(formatStyleDirectiveLine(next)).toBe('linkStyle default interpolate basis stroke:#ff3');
    });

    it('patches only the focused style line', () => {
        const next = patchStyleDirectiveAtLine(FLOW, 9, (line) => setStyleDecl(line, 'fill', '#dc2626'));
        expect(next).toContain('style D fill:#dc2626,stroke:#2563eb');
        expect(next).toContain('style A fill:#16a34a,stroke:#16a34a,stroke-dasharray:8 4');
    });

    it('can clear a decl and set interpolate', () => {
        const next = patchStyleDirectiveAtLine(FLOW, 8, (line) => setStyleInterpolate(setStyleDecl(line, 'stroke-dasharray', undefined), 'step'));
        expect(next).toContain('linkStyle 0 interpolate step stroke:#0c2026');
        expect(next).not.toMatch(/linkStyle 0[^\n]*stroke-dasharray/);
    });
});

describe('resolveStyleDirective', () => {
    it('names the node for a style line', () => {
        const parsed = parseStyleDirectiveLine('    style D fill:#2563eb,stroke:#2563eb')!;
        const resolved = resolveStyleDirective(FLOW, parsed);
        expect(resolved.heading).toBe('Node style');
        expect(resolved.summary).toBe('D · Debug');
        expect(resolved.targets).toEqual([{ id: 'D', label: 'D · Debug' }]);
    });

    it('names the edge endpoints for a linkStyle index', () => {
        const parsed = parseStyleDirectiveLine('    linkStyle 2 stroke:#dc2626')!;
        const resolved = resolveStyleDirective(FLOW, parsed);
        expect(resolved.heading).toBe('Link style');
        expect(resolved.summary).toBe('Is it working? → Debug (No)');
    });

    it('reads the current source line by number', () => {
        const found = readStyleDirectiveAt(FLOW, 7);
        expect(found?.parsed.ids).toEqual(['A']);
        expect(found?.resolved.summary).toBe('A · Start');
    });
});

describe('extraStyleDecls', () => {
    it('returns unknown keys after the documented fields', () => {
        const parsed = parseStyleDirectiveLine('style A fill:#f9f,filter:drop-shadow(0 1px 1px #000)')!;
        expect(extraStyleDecls(parsed, NODE_STYLE_FIELDS)).toEqual([['filter', 'drop-shadow(0 1px 1px #000)']]);
        expect(extraStyleDecls(parsed, LINK_STYLE_FIELDS).map(([key]) => key)).toContain('filter');
    });
});
