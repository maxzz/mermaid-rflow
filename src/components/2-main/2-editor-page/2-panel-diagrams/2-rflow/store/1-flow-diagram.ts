import { type Edge, type Node } from 'reactflow';
import { proxy } from 'valtio';
import { type ReactFlowData } from '../converter';
import { cloneGraphData } from '../storage/saved-diagrams';

export type RflowDiagramState = {
    nodes: Node[];
    edges: Edge[];
    converting: boolean;
    error: string | null;
    ms: number;
    lastAppliedSource: string;
};

export const rflowDiagram = proxy<RflowDiagramState>({
    nodes: [],
    edges: [],
    converting: false,
    error: null,
    ms: 0,
    lastAppliedSource: '',
});

export function setFlowData(data: ReactFlowData) {
    rflowDiagram.nodes = data.nodes;
    rflowDiagram.edges = data.edges;
}

export function setFlowNodes(nodes: Node[]) {
    rflowDiagram.nodes = nodes;
}

export function setFlowEdges(edges: Edge[]) {
    rflowDiagram.edges = edges;
}

export function restoreFlow(source: string, data: ReactFlowData) {
    rflowDiagram.lastAppliedSource = source;
    rflowDiagram.nodes = cloneGraphData(data.nodes);
    rflowDiagram.edges = cloneGraphData(data.edges);
    rflowDiagram.error = null;
    rflowDiagram.ms = 0;
    rflowDiagram.converting = false;
}
