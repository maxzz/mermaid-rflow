import { useRef } from 'react';
import { useSetAtom } from 'jotai';
import { type Edge, type Node, useStoreApi } from 'reactflow';
import { createMarkingRect } from '../../../../../../ui/local-ui/1-marking-rect/a-store-marking';
import { rf_Diagram, setRflowEdges, setRflowNodes } from '../8-store/0-flow-diagram';
import { rf_SelectedEdgesAtom, rf_SelectedNodesAtom } from '../8-store/a-rflow-ui-atoms';
import { idsInScreenRect, type HitEdge, type HitNode, type RectFit } from './8-hit-test';
import { marqueeSelection, withSelectedFlag } from './8-selection';

import { type Rect } from '../../../../../../ui/local-ui/1-marking-rect/9-types';
import { MarkingRectDiv } from '../../../../../../ui/local-ui/1-marking-rect/8-1-marking-rect-div';
import { useMarkingRectDrag } from '../../../../../../ui/local-ui/1-marking-rect/0-use-marking-rect-drag';

type SurfaceRef = { readonly current: HTMLDivElement | null; };

export function RflowMarquee({ surfaceRef, enabled, onBackgroundClick }: { surfaceRef: SurfaceRef; enabled: boolean; onBackgroundClick?: () => void; }) {
    const rfStore = useStoreApi();

    const setSelectedNodes = useSetAtom(rf_SelectedNodesAtom);
    const setSelectedEdges = useSetAtom(rf_SelectedEdgesAtom);

    const lastKey = useRef('');
    const onBackgroundClickRef = useRef(onBackgroundClick);
    const additiveRef = useRef(false);
    const baseRef = useRef<{ nodeIds: Set<string>; edgeIds: Set<string>; }>({ nodeIds: new Set(), edgeIds: new Set() });

    onBackgroundClickRef.current = onBackgroundClick;

    const onApply = (box: Rect) => {
        const surface = surfaceRef.current;
        if (!surface) {
            return;
        }

        const state = rfStore.getState();
        const origin = flowOrigin(surface);
        const [tx, ty, zoom] = state.transform;
        const nodes = hitNodes(state.nodeInternals);
        const edges = hitEdges(state.edges);
        const screenRect = { x: box.x - origin.x, y: box.y - origin.y, width: box.width, height: box.height };
        const transform = { x: tx, y: ty, zoom };
        const fit: RectFit = additiveRef.current ? 'inside' : 'overlap';
        const ids = idsInScreenRect(nodes, edges, screenRect, transform, fit);

        const selection = marqueeSelection(ids.nodeIds, ids.edgeIds, additiveRef.current ? baseRef.current : null);

        const key = `${[...selection.nodeIds].join('\0')}|${[...selection.edgeIds].join('\0')}`;
        if (key === lastKey.current) {
            return;
        }
        lastKey.current = key;
        writeSelection(selection.nodeIds, selection.edgeIds, setSelectedNodes, setSelectedEdges);
    };

    useMarkingRectDrag({
        rect: rflowMarkingRect,
        surfaceRef,
        enabled,
        shouldStart: (event) => isFlowBackgroundTarget(event.target),
        onStart: (event) => {
            lastKey.current = '';
            additiveRef.current = event.shiftKey;
            baseRef.current = event.shiftKey ? selectedIds() : { nodeIds: new Set(), edgeIds: new Set() };
        },
        onUpdate: onApply,
        onCommit: onApply,
        onClick: () => {
            lastKey.current = '';
            writeSelection(new Set(), new Set(), setSelectedNodes, setSelectedEdges);
            onBackgroundClickRef.current?.();
        },
    });

    return <MarkingRectDiv rect={rflowMarkingRect} />;
}

function selectedIds() {
    return {
        nodeIds: new Set((rf_Diagram.nodes as Node[]).filter((node) => node.selected).map((node) => node.id)),
        edgeIds: new Set((rf_Diagram.edges as Edge[]).filter((edge) => edge.selected).map((edge) => edge.id)),
    };
}

function writeSelection(nodeIds: ReadonlySet<string>, edgeIds: ReadonlySet<string>, setSelectedNodes: (nodes: Node[]) => void, setSelectedEdges: (edges: Edge[]) => void) {
    const nextNodes = withSelectedFlag(rf_Diagram.nodes as Node[], nodeIds);
    const nextEdges = withSelectedFlag(rf_Diagram.edges as Edge[], edgeIds);

    if (nextNodes !== rf_Diagram.nodes) {
        setRflowNodes(nextNodes);
        setSelectedNodes(nextNodes.filter((node) => node.selected));
    }

    if (nextEdges !== rf_Diagram.edges) {
        setRflowEdges(nextEdges);
        setSelectedEdges(nextEdges.filter((edge) => edge.selected));
    }
}

function hitNodes(nodeInternals: Map<string, Node>): HitNode[] {
    const nodes: HitNode[] = [];
    nodeInternals.forEach(
        (node) => {
            const abs = node.positionAbsolute ?? node.position;
            nodes.push({
                id: node.id,
                x: abs.x,
                y: abs.y,
                width: node.width ?? 0,
                height: node.height ?? 0,
                selectable: node.selectable,
                hidden: node.hidden,
            });
        }
    );
    return nodes;
}

function hitEdges(edges: Edge[]): HitEdge[] {
    return edges.map(
        (edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
        })
    );
}

function flowOrigin(surface: HTMLElement) {
    const flow = surface.querySelector('.react-flow');
    if (!(flow instanceof HTMLElement)) {
        return { x: 0, y: 0 };
    }
    const surfaceBounds = surface.getBoundingClientRect();
    const flowBounds = flow.getBoundingClientRect();
    return { x: flowBounds.left - surfaceBounds.left, y: flowBounds.top - surfaceBounds.top };
}

//---------------------------------------------------------------------------

function isFlowBackgroundTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) {
        return false;
    }
    if (target.closest(BLOCKED_TARGET)) {
        return false;
    }
    return Boolean(target.closest('.react-flow__pane, .react-flow__background'));
}

const BLOCKED_TARGET = [
    '.react-flow__node',
    '.react-flow__edge',
    '.react-flow__handle',
    '.react-flow__resize-control',
    '.react-flow__panel',
    '.react-flow__minimap',
    '.react-flow__controls',
    '.react-flow__attribution',
    '.react-flow__node-toolbar',
    'button',
    'a',
    'input',
    'textarea',
    'select',
    '[role="toolbar"]',
].join(',');

//---------------------------------------------------------------------------

const rflowMarkingRect = createMarkingRect(); // One rectangle state for the Rflow canvas. Other views create their own with `createMarkingRect`.
