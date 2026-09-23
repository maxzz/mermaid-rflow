import { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { type Edge, type Node, useStoreApi } from 'reactflow';
import { createMarkingRect } from '../../4-common/1-marking-rect/a-store-marking';
import { rf_Diagram, setRflowEdges, setRflowNodes } from '../8-store/0-flow-diagram';
import { rf_SelectedEdgesAtom, rf_SelectedNodesAtom } from '../8-store/a-rflow-ui-atoms';
import { idsInScreenRect, type HitEdge, type HitNode } from './8-hit-test';
import { withSelectedFlag } from './8-selection';

import { type Rect } from '../../4-common/1-marking-rect/9-types';
import { MarkingRectDiv } from '../../4-common/1-marking-rect/8-1-marking-rect-div';
import { useMarkingRectDrag } from '../../4-common/1-marking-rect/0-use-marking-rect-drag';

import './0-2-rflow-marquee.css';

type SurfaceRef = { readonly current: HTMLDivElement | null; };

export function RflowMarquee({ surfaceRef, enabled, onBackgroundClick }: { surfaceRef: SurfaceRef; enabled: boolean; onBackgroundClick?: () => void; }) {
    const rfStore = useStoreApi();

    const setSelectedNodes = useSetAtom(rf_SelectedNodesAtom);
    const setSelectedEdges = useSetAtom(rf_SelectedEdgesAtom);

    const lastKey = useRef('');
    const spaceDown = useRef(false);
    const onBackgroundClickRef = useRef(onBackgroundClick);

    onBackgroundClickRef.current = onBackgroundClick;

    useEffect(
        () => {
            function down(event: KeyboardEvent) {
                if (event.code !== 'Space' || event.repeat || isEditableTarget(event.target)) {
                    return;
                }
                spaceDown.current = true;
                surfaceRef.current?.setAttribute('data-space-pan', '');
            }
            function up(event: KeyboardEvent) {
                if (event.code === 'Space') {
                    clearSpace();
                }
            }
            function clearSpace() {
                spaceDown.current = false;
                surfaceRef.current?.removeAttribute('data-space-pan');
            }

            const abortController = new AbortController();
            window.addEventListener('keydown', down, { signal: abortController.signal });
            window.addEventListener('keyup', up, { signal: abortController.signal });
            window.addEventListener('blur', clearSpace, { signal: abortController.signal });
            
            return () => {
                abortController.abort();
                clearSpace();
            };
        },
        []);

    useEffect(
        () => {
            const surface = surfaceRef.current;
            if (!surface) {
                return;
            }
            surface.toggleAttribute('data-marking-armed', enabled);
            return () => surface.removeAttribute('data-marking-armed');
        },
        [enabled, surfaceRef]);

    const onApply = (box: Rect) => {
        const surface = surfaceRef.current;
        if (!surface) {
            return;
        }

        const state = rfStore.getState();
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

    useMarkingRectDrag({
        rect: rflowMarkingRect,
        surfaceRef,
        enabled,
        shouldStart: (event) => !spaceDown.current && isFlowBackgroundTarget(event.target),
        onStart: () => { lastKey.current = ''; },
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

function isEditableTarget(target: EventTarget | null) {
    return target instanceof HTMLElement && (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
    );
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
