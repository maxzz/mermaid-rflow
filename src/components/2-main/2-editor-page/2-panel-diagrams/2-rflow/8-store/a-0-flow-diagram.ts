import { proxy } from 'valtio';
import { type Edge, type Node } from 'reactflow';
import { type ReactFlowData } from '../2-converter';
import { cloneGraphData } from './a-8-local-storage-saved-diagrams';

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

export const rf_Diagram = proxy<RflowDiagramState>({
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
    rf_Diagram.nodes = data.nodes;
    rf_Diagram.edges = data.edges;
}

export function setRflowNodes(nodes: Node[]) {
    rf_Diagram.nodes = nodes;
}

export function setRflowEdges(edges: Edge[]) {
    rf_Diagram.edges = edges;
}

export function restoreRflow(source: string, data: ReactFlowData) {
    rf_Diagram.lastAppliedSource = source;
    rf_Diagram.nodes = cloneGraphData(data.nodes);
    rf_Diagram.edges = cloneGraphData(data.edges);
    rf_Diagram.error = null;
    rf_Diagram.ms = 0;
    rf_Diagram.converting = false;
}
