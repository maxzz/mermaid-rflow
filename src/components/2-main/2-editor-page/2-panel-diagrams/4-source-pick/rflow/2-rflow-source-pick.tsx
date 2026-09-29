import { useAtomValue } from 'jotai';
import { useSnapshot } from 'valtio';
import { internalsSymbol, useStore, type Edge, type Node } from 'reactflow';
import { sourceLink } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { rf_ExportingAtom } from '@/components/2-main/2-editor-page/2-panel-diagrams/2-rflow/8-store/a-1-rflow-ui-atoms';
import { catalogKeyForEdge, catalogKeyForNode } from '@/components/2-main/2-editor-page/2-panel-diagrams/2-rflow/1-canvas/8-catalog-rflow';
import { mermaidIdFromEndpoint, mermaidIdOf } from '@/components/2-main/2-editor-page/2-panel-diagrams/2-rflow/2-converter/8-mermaid-ids';
import { connectionCaption } from '../2-marker-shape';
import { SourcePickLayer } from '../7-marker-layer';
import { editorFocus } from '../8-editor-focus';
import { flowSourceMarkers, type FlowHandle, type MeasuredEdge, type MeasuredNode } from './1-flow-pick-model';

export function RflowSourcePick() {
    const exporting = useAtomValue(rf_ExportingAtom);
    const focused = useSnapshot(editorFocus).focused;
    const link = useSnapshot(sourceLink);
    const transform = useStore((state) => state.transform);
    const nodeInternals = useStore((state) => state.nodeInternals);
    const edges = useStore((state) => state.edges);

    if (exporting) {
        return null;
    }

    const keys = link.keys as string[];
    const editor = focused && link.origin === 'editor' && keys.length > 0;
    const selectionKey = editor ? `${link.focusLine ?? ''}:${keys.join('|')}` : '';
    const [tx, ty, zoom] = transform;
    const markers = editor
        ? flowSourceMarkers({
            keys,
            nodes: measuredNodes(nodeInternals),
            edges: measuredEdges(edges),
            view: { tx, ty, zoom },
        })
        : [];

    return <SourcePickLayer markers={markers} selectionKey={selectionKey} />;
}

function measuredNodes(nodeInternals: Map<string, Node>): MeasuredNode[] {
    const nodes: MeasuredNode[] = [];
    nodeInternals.forEach((node) => {
        if (node.hidden) {
            return;
        }
        const w = node.width ?? 0;
        const h = node.height ?? 0;
        if (w <= 0 || h <= 0) {
            return;
        }
        const abs = node.positionAbsolute ?? node.position;
        nodes.push({
            id: node.id,
            key: catalogKeyForNode(node),
            name: mermaidIdOf(node),
            x: abs.x,
            y: abs.y,
            w,
            h,
            sourcePosition: node.sourcePosition,
            handles: sourceHandles(node),
        });
    });
    return nodes;
}

function measuredEdges(edges: Edge[]): MeasuredEdge[] {
    return edges.map((edge) => ({
        key: catalogKeyForEdge(edge),
        text: connectionCaption(
            mermaidIdFromEndpoint(edge.source),
            mermaidIdFromEndpoint(edge.target),
            typeof edge.data?.mermaidType === 'string' ? edge.data.mermaidType : undefined,
            edgeText(edge),
        ),
        sourceId: edge.source,
        sourceHandle: edge.sourceHandle,
    }));
}

function sourceHandles(node: Node): FlowHandle[] | null {
    const source = node[internalsSymbol]?.handleBounds?.source;
    if (!source?.length) {
        return null;
    }
    return source.map((handle) => ({
        id: handle.id,
        x: handle.x,
        y: handle.y,
        width: handle.width,
        height: handle.height,
        position: handle.position,
    }));
}

function edgeText(edge: Edge): string | undefined {
    if (typeof edge.label === 'string' || typeof edge.label === 'number') {
        const text = String(edge.label).trim();
        return text || undefined;
    }
    return undefined;
}
