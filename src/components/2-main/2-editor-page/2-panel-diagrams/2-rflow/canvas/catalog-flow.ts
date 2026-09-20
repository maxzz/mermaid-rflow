import { type Edge, type Node } from 'reactflow';
import type { CatalogEntry } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { isSubgraphNode, mermaidIdFromEndpoint, mermaidIdOf } from '../converter/mermaid-ids';

export function catalogKeyForNode(node: Node): string {
    if (isSubgraphNode(node)) {
        return `subgraph:${mermaidIdOf(node)}`;
    }
    return `node:${node.id}`;
}

export function catalogKeyForEdge(edge: Edge): string {
    const from = mermaidIdFromEndpoint(edge.source);
    const to = mermaidIdFromEndpoint(edge.target);
    const label = edgeLabelOf(edge);
    return label ? `edge:${from}>${to}:${label}` : `edge:${from}>${to}`;
}

export function catalogFlowGraph(nodes: Node[], edges: Edge[]): CatalogEntry[] {
    const entries: CatalogEntry[] = [];
    for (const node of nodes) {
        if (isSubgraphNode(node)) {
            const id = mermaidIdOf(node);
            entries.push({
                key: `subgraph:${id}`,
                kind: 'subgraph',
                ids: [id],
                label: labelOf(node),
            });
        }
        else {
            entries.push({
                key: `node:${node.id}`,
                kind: 'node',
                ids: [node.id],
                label: labelOf(node),
            });
        }
    }
    for (const edge of edges) {
        const from = mermaidIdFromEndpoint(edge.source);
        const to = mermaidIdFromEndpoint(edge.target);
        const label = edgeLabelOf(edge);
        entries.push({
            key: catalogKeyForEdge(edge),
            kind: 'edge',
            ids: [from, to],
            label,
        });
    }
    return entries;
}

export function rfIdsForLinkKeys(keys: string[], nodes: Node[]): string[] {
    const ids: string[] = [];
    const seen = new Set<string>();

    function push(id: string | undefined) {
        if (!id || seen.has(id)) {
            return;
        }
        seen.add(id);
        ids.push(id);
    }

    for (const key of keys) {
        if (key.startsWith('node:')) {
            const id = key.slice('node:'.length);
            if (nodes.some((n) => n.id === id)) {
                push(id);
            }
            continue;
        }
        if (key.startsWith('subgraph:')) {
            const mermaidId = key.slice('subgraph:'.length);
            const match = nodes.find((n) => isSubgraphNode(n) && mermaidIdOf(n) === mermaidId);
            push(match?.id);
            continue;
        }
        if (key.startsWith('edge:')) {
            const rest = key.slice('edge:'.length);
            const pair = rest.split(':')[0] ?? '';
            const [from, to] = pair.split('>');
            push(rfIdFromEndpoint(from ?? '', nodes));
            push(rfIdFromEndpoint(to ?? '', nodes));
        }
    }
    return ids;
}

function rfIdFromEndpoint(endpoint: string, nodes: Node[]): string | undefined {
    if (!endpoint) {
        return undefined;
    }
    if (nodes.some((n) => n.id === endpoint)) {
        return endpoint;
    }
    const group = nodes.find((n) => isSubgraphNode(n) && mermaidIdOf(n) === endpoint);
    return group?.id;
}

function labelOf(node: Node): string | undefined {
    return node.data?.label == null ? undefined : String(node.data.label);
}

function edgeLabelOf(edge: Edge): string | undefined {
    if (edge.label == null || String(edge.label) === '') {
        return undefined;
    }
    return String(edge.label);
}
