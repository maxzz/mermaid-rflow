/**
 * Adapted from mermaid-reactflow-editor (MIT).
 */
import { type Edge, type Node } from 'reactflow';
import { ALIGNMENT_TYPES, DISTRIBUTION_TYPES, type AlignmentType, type DistributionType } from '../converter/constants';
import { nextRfId, prefixForNode } from '../converter/mermaid-ids';

export function alignNodes(nodes: Node[], selectedNodes: Node[], alignment: AlignmentType): Node[] {
    if (selectedNodes.length < 2) {
        return nodes;
    }
    const bounds = selectedNodes.map((node) => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: node.width || 150,
        height: node.height || 50,
    }));
    const newNodes = [...nodes];
    switch (alignment) {
        case ALIGNMENT_TYPES.LEFT: {
            const leftX = Math.min(...bounds.map((b) => b.x));
            bounds.forEach((bound) => {
                const nodeIndex = newNodes.findIndex((n) => n.id === bound.id);
                if (nodeIndex !== -1) {
                    newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, x: leftX } };
                }
            });
            break;
        }
        case ALIGNMENT_TYPES.RIGHT: {
            const rightX = Math.max(...bounds.map((b) => b.x + b.width));
            bounds.forEach((bound) => {
                const nodeIndex = newNodes.findIndex((n) => n.id === bound.id);
                if (nodeIndex !== -1) {
                    newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, x: rightX - bound.width } };
                }
            });
            break;
        }
        case ALIGNMENT_TYPES.TOP: {
            const topY = Math.min(...bounds.map((b) => b.y));
            bounds.forEach((bound) => {
                const nodeIndex = newNodes.findIndex((n) => n.id === bound.id);
                if (nodeIndex !== -1) {
                    newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, y: topY } };
                }
            });
            break;
        }
        case ALIGNMENT_TYPES.BOTTOM: {
            const bottomY = Math.max(...bounds.map((b) => b.y + b.height));
            bounds.forEach((bound) => {
                const nodeIndex = newNodes.findIndex((n) => n.id === bound.id);
                if (nodeIndex !== -1) {
                    newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, y: bottomY - bound.height } };
                }
            });
            break;
        }
        case ALIGNMENT_TYPES.CENTER_HORIZONTAL: {
            const avgX = bounds.reduce((sum, b) => sum + b.x + b.width / 2, 0) / bounds.length;
            bounds.forEach((bound) => {
                const nodeIndex = newNodes.findIndex((n) => n.id === bound.id);
                if (nodeIndex !== -1) {
                    newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, x: avgX - bound.width / 2 } };
                }
            });
            break;
        }
        case ALIGNMENT_TYPES.CENTER_VERTICAL: {
            const avgY = bounds.reduce((sum, b) => sum + b.y + b.height / 2, 0) / bounds.length;
            bounds.forEach((bound) => {
                const nodeIndex = newNodes.findIndex((n) => n.id === bound.id);
                if (nodeIndex !== -1) {
                    newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, y: avgY - bound.height / 2 } };
                }
            });
            break;
        }
    }
    return newNodes;
}

export function distributeNodes(nodes: Node[], selectedNodes: Node[], direction: DistributionType): Node[] {
    if (selectedNodes.length < 3) {
        return nodes;
    }
    const bounds = selectedNodes.map((node) => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: node.width || 150,
        height: node.height || 50,
    }));
    const newNodes = [...nodes];
    if (direction === DISTRIBUTION_TYPES.HORIZONTAL) {
        bounds.sort((a, b) => a.x - b.x);
        const leftEdge = bounds[0].x;
        const rightEdge = bounds[bounds.length - 1].x + bounds[bounds.length - 1].width;
        const totalWidths = bounds.reduce((s, b) => s + b.width, 0);
        const available = rightEdge - leftEdge - totalWidths;
        const spacing = Math.max(0, available / (bounds.length - 1));
        let cursor = leftEdge;
        bounds.forEach((bound) => {
            const nodeIndex = newNodes.findIndex((n) => n.id === bound.id);
            if (nodeIndex !== -1) {
                newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, x: cursor } };
                cursor += bound.width + spacing;
            }
        });
    } else {
        bounds.sort((a, b) => a.y - b.y);
        const topEdge = bounds[0].y;
        const bottomEdge = bounds[bounds.length - 1].y + bounds[bounds.length - 1].height;
        const totalHeights = bounds.reduce((s, b) => s + b.height, 0);
        const available = bottomEdge - topEdge - totalHeights;
        const spacing = Math.max(0, available / (bounds.length - 1));
        let cursor = topEdge;
        bounds.forEach((bound) => {
            const nodeIndex = newNodes.findIndex((n) => n.id === bound.id);
            if (nodeIndex !== -1) {
                newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, y: cursor } };
                cursor += bound.height + spacing;
            }
        });
    }
    return newNodes;
}

export function bringToFront(nodes: Node[], selectedNodes: Node[]): Node[] {
    const maxZ = Math.max(...nodes.map((n) => n.zIndex || 0));
    return nodes.map((node) =>
        selectedNodes.some((sn) => sn.id === node.id)
            ? { ...node, zIndex: maxZ + 1 }
            : node
    );
}

export function sendToBack(nodes: Node[], selectedNodes: Node[]): Node[] {
    const minZ = Math.min(...nodes.map((n) => n.zIndex || 0));
    return nodes.map((node) =>
        selectedNodes.some((sn) => sn.id === node.id)
            ? { ...node, zIndex: minZ - 1 }
            : node
    );
}

export function duplicateNodes(nodes: Node[], selectedNodes: Node[]): Node[] {
    const newNodes = [...nodes];
    selectedNodes.forEach((node) => {
        newNodes.push({
            ...node,
            id: nextRfId(newNodes, prefixForNode(node)),
            position: { x: node.position.x + 50, y: node.position.y + 50 },
            selected: false,
        });
    });
    return newNodes;
}

export function deleteSelected(nodes: Node[], edges: Edge[], selectedNodes: Node[], selectedEdges: Edge[]) {
    const nodeIdsToDelete = selectedNodes.map((n) => n.id);
    const edgeIdsToDelete = selectedEdges.map((e) => e.id);
    const newNodes = nodes.filter((n) => !nodeIdsToDelete.includes(n.id));
    const newEdges = edges.filter((e) =>
        !edgeIdsToDelete.includes(e.id) &&
        !nodeIdsToDelete.includes(e.source) &&
        !nodeIdsToDelete.includes(e.target)
    );
    return { newNodes, newEdges };
}

export function lockNodes(nodes: Node[], selectedNodes: Node[]): Node[] {
    return nodes.map((node) =>
        selectedNodes.some((sn) => sn.id === node.id)
            ? { ...node, draggable: false, data: { ...node.data, locked: true } }
            : node
    );
}

export function unlockNodes(nodes: Node[], selectedNodes: Node[]): Node[] {
    return nodes.map((node) =>
        selectedNodes.some((sn) => sn.id === node.id)
            ? { ...node, draggable: true, data: { ...node.data, locked: false } }
            : node
    );
}
