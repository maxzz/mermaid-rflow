import { atom } from 'jotai';
import { type Node } from 'reactflow';
import { rf_Diagram, setRflowNodes } from './a-0-flow-diagram';
import { rf_SelectedNodesAtom } from './a-1-rflow-ui-atoms';

//---------------------------------------------------------------------------
// Alignment types.

export const ALIGNMENT_TYPES = {
    LEFT: 'left',
    RIGHT: 'right',
    TOP: 'top',
    BOTTOM: 'bottom',
    CENTER_HORIZONTAL: 'center-horizontal',
    CENTER_VERTICAL: 'center-vertical',
} as const;

export type AlignmentType = typeof ALIGNMENT_TYPES[keyof typeof ALIGNMENT_TYPES];

//---------------------------------------------------------------------------
// Distribution types.

export const DISTRIBUTION_TYPES = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical',
} as const;

export type DistributionType = typeof DISTRIBUTION_TYPES[keyof typeof DISTRIBUTION_TYPES];

//---------------------------------------------------------------------------
// Arrange selected nodes

export const rf_CommitNodesAtom = atom(null, (_get, set, next: Node[]) => {
    setRflowNodes(next);
    set(rf_SelectedNodesAtom, next.filter((node) => node.selected));
});

export const rf_AlignNodesAtom = atom(null, (get, set, alignment: AlignmentType) => {
    const next = alignNodes(rf_Diagram.nodes as Node[], get(rf_SelectedNodesAtom), alignment);
    set(rf_CommitNodesAtom, next);
});

export const rf_DistributeNodesAtom = atom(null, (get, set, direction: DistributionType) => {
    const next = distributeNodes(rf_Diagram.nodes as Node[], get(rf_SelectedNodesAtom), direction);
    set(rf_CommitNodesAtom, next);
});

function alignNodes(nodes: Node[], selectedNodes: Node[], alignment: AlignmentType): Node[] {
    if (selectedNodes.length < 2) {
        return nodes;
    }

    const bounds = selectedNodes.map(
        (node) => ({
            id: node.id,
            x: node.position.x,
            y: node.position.y,
            width: node.width || 150,
            height: node.height || 50,
        })
    );

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

function distributeNodes(nodes: Node[], selectedNodes: Node[], direction: DistributionType): Node[] {
    if (selectedNodes.length < 3) {
        return nodes;
    }

    const bounds = selectedNodes.map(
        (node) => ({
            id: node.id,
            x: node.position.x,
            y: node.position.y,
            width: node.width || 150,
            height: node.height || 50,
        })
    );

    const newNodes = [...nodes];
    if (direction === DISTRIBUTION_TYPES.HORIZONTAL) {
        bounds.sort((a, b) => a.x - b.x);
        const leftEdge = bounds[0].x;
        const rightEdge = bounds[bounds.length - 1].x + bounds[bounds.length - 1].width;
        const totalWidths = bounds.reduce((s, b) => s + b.width, 0);
        const available = rightEdge - leftEdge - totalWidths;
        const spacing = Math.max(0, available / (bounds.length - 1));
        let cursor = leftEdge;
        bounds.forEach(
            (bound) => {
                const nodeIndex = newNodes.findIndex((n) => n.id === bound.id);
                if (nodeIndex !== -1) {
                    newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, x: cursor } };
                    cursor += bound.width + spacing;
                }
            }
        );
    } else {
        bounds.sort((a, b) => a.y - b.y);
        const topEdge = bounds[0].y;
        const bottomEdge = bounds[bounds.length - 1].y + bounds[bounds.length - 1].height;
        const totalHeights = bounds.reduce((s, b) => s + b.height, 0);
        const available = bottomEdge - topEdge - totalHeights;
        const spacing = Math.max(0, available / (bounds.length - 1));
        let cursor = topEdge;
        bounds.forEach(
            (bound) => {
                const nodeIndex = newNodes.findIndex((n) => n.id === bound.id);
                if (nodeIndex !== -1) {
                    newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { ...newNodes[nodeIndex].position, y: cursor } };
                    cursor += bound.height + spacing;
                }
            }
        );
    }
    return newNodes;
}

//---------------------------------------------------------------------------
// bring to front / send to back (Not used yet)

function bringToFront(nodes: Node[], selectedNodes: Node[]): Node[] {
    const maxZ = Math.max(...nodes.map((n) => n.zIndex || 0));
    return nodes.map(
        (node) => (
            selectedNodes.some((sn) => sn.id === node.id) ? { ...node, zIndex: maxZ + 1 } : node
        )
    );
}

function sendToBack(nodes: Node[], selectedNodes: Node[]): Node[] {
    const minZ = Math.min(...nodes.map((n) => n.zIndex || 0));
    return nodes.map(
        (node) => (
            selectedNodes.some((sn) => sn.id === node.id) ? { ...node, zIndex: minZ - 1 } : node
        )
    );
}
