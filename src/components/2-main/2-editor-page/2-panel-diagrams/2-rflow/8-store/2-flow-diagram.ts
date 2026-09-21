import { proxy } from 'valtio';
import { type Edge, type Node } from 'reactflow';
import { type ReactFlowData } from '../2-converter';
import { cloneGraphData } from './1-local-storage-saved-diagrams';

//---------------------------------------------------------------------------
// Flow diagram

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

//---------------------------------------------------------------------------
// Flow diagram methods

export function setRflowData(data: ReactFlowData) {
    rflowDiagram.nodes = data.nodes;
    rflowDiagram.edges = data.edges;
}

export function setRflowNodes(nodes: Node[]) {
    rflowDiagram.nodes = nodes;
}

export function setRflowEdges(edges: Edge[]) {
    rflowDiagram.edges = edges;
}

export function restoreRflow(source: string, data: ReactFlowData) {
    rflowDiagram.lastAppliedSource = source;
    rflowDiagram.nodes = cloneGraphData(data.nodes);
    rflowDiagram.edges = cloneGraphData(data.edges);
    rflowDiagram.error = null;
    rflowDiagram.ms = 0;
    rflowDiagram.converting = false;
}
