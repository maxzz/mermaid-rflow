import { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { type Edge, type Node, useStoreApi } from 'reactflow';
import { createMarkingRect, MarkingRect, useMarkingDrag, type Rect } from '../../4-common/1-marking-rect';
import { rf_Diagram, setRflowEdges, setRflowNodes } from '../8-store/0-flow-diagram';
import { rf_SelectedEdgesAtom, rf_SelectedNodesAtom } from '../8-store/a-rflow-ui-atoms';
import { idsInScreenRect, type HitEdge, type HitNode } from './1-hit-test';
import { withSelectedFlag } from './2-selection';
import './3-rflow-marquee.css';

/** One rectangle for the flow canvas. Other views create their own with `createMarkingRect`. */
const rflowMarkingRect = createMarkingRect();

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

type SurfaceRef = { readonly current: HTMLDivElement | null; };

export function RflowMarquee({ surfaceRef, enabled, onBackgroundClick }: {
    surfaceRef: SurfaceRef;
    enabled: boolean;
    onBackgroundClick?: () => void;
}) {
    const store = useStoreApi();
    const setSelectedNodes = useSetAtom(rf_SelectedNodesAtom);
    const setSelectedEdges = useSetAtom(rf_SelectedEdgesAtom);
    const lastKey = useRef('');
    const spaceDown = useRef(false);
    const onBackgroundClickRef = useRef(onBackgroundClick);
    onBackgroundClickRef.current = onBackgroundClick;

    useEffect(() => {
        const down = (event: KeyboardEvent) => {
            if (event.code === 'Space') {
                spaceDown.current = true;
            }
        };
        const up = (event: KeyboardEvent) => {
            if (event.code === 'Space') {
                spaceDown.current = false;
            }
        };
        const clearSpace = () => {
            spaceDown.current = false;
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', clearSpace);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            window.removeEventListener('blur', clearSpace);
            spaceDown.current = false;
        };
    }, []);

    useEffect(() => {
        const surface = surfaceRef.current;
        if (!surface) {
            return;
        }
        surface.toggleAttribute('data-marking-armed', enabled);
        return () => surface.removeAttribute('data-marking-armed');
    }, [enabled, surfaceRef]);

    const apply = (box: Rect) => {
        const surface = surfaceRef.current;
        if (!surface) {
            return;
        }
        const state = store.getState();
        const origin = flowOrigin(surface);
        const [tx, ty, zoom] = state.transform;
        const ids = idsInScreenRect(
            hitNodes(state.nodeInternals),
            hitEdges(state.edges),
            { x: box.x - origin.x, y: box.y - origin.y, width: box.width, height: box.height },
            { x: tx, y: ty, zoom },
        );
        const key = `${ids.nodeIds.join('\0')}|${ids.edgeIds.join('\0')}`;
        if (key === lastKey.current) {
            return;
        }
        lastKey.current = key;
        writeSelection(new Set(ids.nodeIds), new Set(ids.edgeIds), setSelectedNodes, setSelectedEdges);
    };

    useMarkingDrag({
        rect: rflowMarkingRect,
        surfaceRef,
        enabled,
        shouldStart: (event) => !spaceDown.current && isFlowBackgroundTarget(event.target),
        onStart: () => {
            lastKey.current = '';
        },
        onUpdate: apply,
        onCommit: apply,
        onClick: () => {
            lastKey.current = '';
            writeSelection(new Set(), new Set(), setSelectedNodes, setSelectedEdges);
            onBackgroundClickRef.current?.();
        },
    });

    return <MarkingRect rect={rflowMarkingRect} />;
}

function writeSelection(
    nodeIds: ReadonlySet<string>,
    edgeIds: ReadonlySet<string>,
    setSelectedNodes: (nodes: Node[]) => void,
    setSelectedEdges: (edges: Edge[]) => void,
) {
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
    nodeInternals.forEach((node) => {
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
    });
    return nodes;
}

function hitEdges(edges: Edge[]): HitEdge[] {
    return edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
    }));
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

function isFlowBackgroundTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) {
        return false;
    }
    if (target.closest(BLOCKED_TARGET)) {
        return false;
    }
    return Boolean(target.closest('.react-flow__pane, .react-flow__background'));
}
