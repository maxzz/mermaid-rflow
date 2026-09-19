import { describe, expect, it } from 'vitest';
import { classifyMermaidSource, extractHeader, findNodeDefinition, readDirection } from './1-flowchart-source';
import { addNode, connectNodes, deleteNode, renameNode, setDirection } from './2-source-patch';

const FLOW = `\
%% keep this comment
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Ship it]
    B -->|No| D[Debug]
    D --> B
    C --> E[Celebrate]
`;

describe('classifyMermaidSource / extractHeader', () => {
    it('keeps init directives and comments in the prefix', () => {
        const header = extractHeader("%%{init: {'theme':'dark'}}%%\n%% note\ngraph LR\n    A[A]\n");
        expect(header.kind).toBe('flowchart');
        if (header.kind !== 'flowchart') {
            return;
        }
        expect(header.declaration).toBe('graph LR');
        expect(header.prefix).toContain('%%{init:');
        expect(header.prefix).toContain('%% note');
    });

    it('rejects other diagram types', () => {
        expect(classifyMermaidSource('sequenceDiagram\n    Alice->>Bob: Hi\n')).toBe('other');
    });
});

describe('setDirection', () => {
    it('rewrites only the header direction token', () => {
        const result = setDirection(FLOW, 'LR');
        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.source).toContain('%% keep this comment');
        expect(result.source).toContain('graph LR');
        expect(result.source).not.toContain('graph TD');
        expect(result.source).toContain('A[Start] --> B{Is it working?}');
    });

    it('refuses to overwrite a sequence diagram', () => {
        expect(setDirection('sequenceDiagram\n    Alice->>Bob: Hi\n', 'LR')).toEqual({ ok: false, reason: 'not-flowchart' });
    });

    it('normalizes TB in the source to TD when reading', () => {
        expect(readDirection('flowchart TB\n    A[A]\n')).toBe('TD');
    });
});

describe('renameNode', () => {
    it('replaces only the definition label', () => {
        const result = renameNode(FLOW, 'A', 'Begin');
        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.source).toContain('A[Begin] --> B{Is it working?}');
        expect(result.source).toContain('%% keep this comment');
        expect(findNodeDefinition(result.source, 'A')?.label).toBe('Begin');
    });

    it('quotes labels that need it', () => {
        const result = renameNode(FLOW, 'C', 'Ship | now');
        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.source).toContain('C["Ship | now"]');
    });
});

describe('addNode / connectNodes', () => {
    it('appends a child linked from the selected node', () => {
        const added = addNode(FLOW, { shape: 'rect', label: 'Extra', fromId: 'E' });
        expect(added.ok).toBe(true);
        if (!added.ok) {
            return;
        }
        expect(added.source).toContain('n1[Extra]');
        expect(added.source).toContain('E --> n1');
        expect(added.source).toContain('%% keep this comment');
    });

    it('uses shape-specific ids', () => {
        const diamond = addNode(FLOW, { shape: 'diamond', label: 'Maybe' });
        expect(diamond.ok).toBe(true);
        if (!diamond.ok) {
            return;
        }
        expect(diamond.source).toContain('d1{Maybe}');
    });

    it('does not duplicate an existing edge', () => {
        const result = connectNodes(FLOW, 'A', 'B');
        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.changed).toBe(false);
        expect(result.source).toBe(FLOW);
    });

    it('appends a missing edge', () => {
        const result = connectNodes(FLOW, 'E', 'A');
        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.source).toContain('E --> A');
    });

    it('skips structural edits on sequence diagrams', () => {
        const src = 'sequenceDiagram\n    Alice->>Bob: Hi\n';
        expect(addNode(src, { shape: 'rect' }).ok).toBe(false);
        expect(connectNodes(src, 'Alice', 'Bob').ok).toBe(false);
    });
});

describe('deleteNode', () => {
    it('removes a standalone definition and edges, keeping the other endpoint shape', () => {
        const result = deleteNode(FLOW, 'A');
        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.source).not.toMatch(/\bA\b/);
        expect(result.source).toContain('B{Is it working?}');
        expect(result.source).toContain('%% keep this comment');
    });

    it('leaves comments and class-like lines alone when the id is absent', () => {
        const result = deleteNode(FLOW, 'Z');
        expect(result).toEqual({ ok: false, reason: 'not-found' });
    });
});
