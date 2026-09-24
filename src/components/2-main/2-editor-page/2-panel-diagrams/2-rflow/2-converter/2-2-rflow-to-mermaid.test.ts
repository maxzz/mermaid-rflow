import { describe, expect, it } from 'vitest';
import { type Edge, type Node } from 'reactflow';
import { catalogFlowGraph } from '../1-canvas/8-catalog-rflow';
import { buildSourceIndex } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { classifyMermaidSource, extractHeader, reactFlowToMermaid } from './2-1-rflow-to-mermaid';

function node(partial: Partial<Node> & Pick<Node, 'id'>): Node {
    return {
        position: { x: 0, y: 0 },
        data: { label: partial.id },
        ...partial,
    };
}

function edge(partial: Partial<Edge> & Pick<Edge, 'id' | 'source' | 'target'>): Edge {
    return {
        ...partial,
    };
}

describe('classifyMermaidSource', () => {
    it('treats blank source as empty', () => {
        expect(classifyMermaidSource('')).toBe('empty');
        expect(classifyMermaidSource('  \n  ')).toBe('empty');
    });

    it('detects graph and flowchart headers after init directives', () => {
        expect(classifyMermaidSource('graph TD\n    A[A]\n')).toBe('flowchart');
        expect(classifyMermaidSource('flowchart LR\n    A --> B\n')).toBe('flowchart');
        expect(classifyMermaidSource("%%{init: {'theme':'dark'}}%%\ngraph TB\n    A[A]\n")).toBe('flowchart');
    });

    it('rejects other diagram types', () => {
        expect(classifyMermaidSource('sequenceDiagram\n    Alice->>Bob: Hi\n')).toBe('other');
        expect(classifyMermaidSource('classDiagram\n    Animal <|-- Duck\n')).toBe('other');
        expect(classifyMermaidSource('erDiagram\n    A ||--o{ B : r\n')).toBe('other');
        expect(classifyMermaidSource('stateDiagram-v2\n    [*] --> Idle\n')).toBe('other');
        expect(classifyMermaidSource('xychart-beta\n    bar [1]\n')).toBe('other');
    });
});

describe('extractHeader', () => {
    it('keeps an init directive and graph declaration', () => {
        const header = extractHeader("%%{init: {'theme':'base'}}%%\ngraph LR\n    A[A]\n");
        expect(header).toMatchObject({ declaration: 'graph LR' });
        if (header === 'empty' || header === 'other') {
            throw new Error('expected flowchart header');
        }
        expect(header.prefix).toContain('%%{init:');
    });
});

describe('reactFlowToMermaid', () => {
    it('refuses to overwrite a non-flowchart source', () => {
        const result = reactFlowToMermaid(
            [node({ id: 'A', data: { label: 'A' } })],
            [],
            'sequenceDiagram\n    Alice->>Bob: Hi\n',
        );
        expect(result).toEqual({ ok: false, reason: 'not-flowchart' });
    });

    it('emits shapes, labels, and operators from an empty source', () => {
        const nodes: Node[] = [
            node({ id: 'A', data: { label: 'Start', shape: 'rect' } }),
            node({ id: 'B', type: 'diamond', data: { label: 'Check', shape: 'diamond' } }),
            node({ id: 'C', data: { label: 'Go', shape: 'stadium' } }),
            node({ id: 'D', data: { label: 'Loop', shape: 'circle' } }),
            node({ id: 'E', data: { label: 'Soft', shape: 'round' } }),
        ];
        const edges: Edge[] = [
            edge({ id: 'e1', source: 'A', target: 'B', data: { mermaidType: '-->' } }),
            edge({ id: 'e2', source: 'B', target: 'C', label: 'Yes', data: { mermaidType: '-->' } }),
            edge({ id: 'e3', source: 'B', target: 'D', data: { mermaidType: '-.-' } }),
            edge({ id: 'e4', source: 'D', target: 'E', data: { mermaidType: '==>' } }),
        ];
        const result = reactFlowToMermaid(nodes, edges, '');
        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.mermaid).toBe(
            [
                'graph TD',
                '    A[Start]',
                '    B{Check}',
                '    C([Go])',
                '    D((Loop))',
                '    E(Soft)',
                '    A --> B',
                '    B -->|Yes| C',
                '    B -.-> D',
                '    D ==> E',
                '',
            ].join('\n'),
        );
    });

    it('preserves flowchart LR and nests subgraphs', () => {
        const nodes: Node[] = [
            node({
                id: 'subgraph-outer',
                type: 'group',
                data: { label: 'Outer', isSubgraph: true },
            }),
            node({
                id: 'subgraph-inner',
                type: 'group',
                parentNode: 'subgraph-outer',
                data: { label: 'Inner', isSubgraph: true },
            }),
            node({
                id: 'n1',
                parentNode: 'subgraph-inner',
                data: { label: 'New Node', shape: 'rect' },
            }),
            node({ id: 'A', data: { label: 'Start', shape: 'rect' } }),
        ];
        const edges: Edge[] = [
            edge({ id: 'e1', source: 'A', target: 'n1', data: { mermaidType: '-->' } }),
        ];
        const result = reactFlowToMermaid(nodes, edges, 'flowchart LR\n    A[Start]\n');
        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.mermaid).toBe(
            [
                'flowchart LR',
                '    subgraph outer [Outer]',
                '        subgraph inner [Inner]',
                '            n1[New Node]',
                '        end',
                '    end',
                '    A[Start]',
                '    A --> n1',
                '',
            ].join('\n'),
        );
    });

    it('quotes labels that contain mermaid punctuation', () => {
        const result = reactFlowToMermaid(
            [node({ id: 'A', data: { label: 'Wait [go]', shape: 'rect' } })],
            [edge({ id: 'e1', source: 'A', target: 'A', label: 'a|b', data: { mermaidType: '-->' } })],
            'graph TD',
        );
        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.mermaid).toContain('A["Wait [go]"]');
        expect(result.mermaid).toContain('A -->|"a|b"| A');
    });

    it('builds a source index from the serialized graph', () => {
        const nodes: Node[] = [
            node({ id: 'A', data: { label: 'Start', shape: 'rect' } }),
            node({ id: 'B', type: 'diamond', data: { label: 'Check', shape: 'diamond' } }),
        ];
        const edges: Edge[] = [
            edge({ id: 'e1', source: 'A', target: 'B', label: 'Go', data: { mermaidType: '-->' } }),
        ];
        const result = reactFlowToMermaid(nodes, edges, 'graph TD');
        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        const index = buildSourceIndex(result.mermaid, catalogFlowGraph(nodes, edges));
        expect(index.keyToHits.get('node:A')?.[0]).toMatchObject({ line: 2, isDefinition: true });
        expect(index.keyToHits.get('node:B')?.[0]).toMatchObject({ line: 3, isDefinition: true });
        expect(index.lineToKeys.get(4)).toEqual(['node:A', 'node:B', 'edge:A>B:Go']);
    });
});
