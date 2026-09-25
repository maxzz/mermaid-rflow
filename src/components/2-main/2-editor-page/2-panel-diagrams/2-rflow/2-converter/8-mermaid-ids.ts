import { type Node } from 'reactflow';

// Mermaid-safe React Flow node ids for canvas → source write-back.

//---------------------------------------------------------------------------

export function isSubgraphNode(node: Node): boolean {
    return node.type === 'group' || Boolean(node.data?.isSubgraph);
}

export function mermaidIdOf(node: Node): string {
    if (isSubgraphNode(node) && node.id.startsWith(SUBGRAPH_RF_PREFIX)) {
        return node.id.slice(SUBGRAPH_RF_PREFIX.length);
    }
    return node.id;
}

export function mermaidIdFromEndpoint(rfId: string): string {
    return rfId.startsWith(SUBGRAPH_RF_PREFIX) ? rfId.slice(SUBGRAPH_RF_PREFIX.length) : rfId;
}

const SUBGRAPH_RF_PREFIX = 'subgraph-';

//---------------------------------------------------------------------------

export type IdPrefix = 'n' | 'd' | 'sg';

export function prefixForNode(node: Node): IdPrefix {
    if (isSubgraphNode(node)) {
        return 'sg';
    }
    if (node.type === 'diamond' || node.data?.shape === 'diamond') {
        return 'd';
    }
    return 'n';
}

//---------------------------------------------------------------------------
// next RF id

export function nextRfId(nodes: Node[], prefix: IdPrefix): string {
    return rfIdForMermaid(nextMermaidId(nodes, prefix), prefix === 'sg');
}

function rfIdForMermaid(mermaidId: string, subgraph: boolean): string {
    return subgraph ? `${SUBGRAPH_RF_PREFIX}${mermaidId}` : mermaidId;
}

function nextMermaidId(nodes: Node[], prefix: IdPrefix): string {
    const used = new Set(nodes.map((n) => mermaidIdOf(n)));
    let i = 1;
    while (used.has(`${prefix}${i}`)) {
        i += 1;
    }
    return `${prefix}${i}`;
}
