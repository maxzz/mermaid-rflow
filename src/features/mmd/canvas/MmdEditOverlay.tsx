import { type PointerEvent as ReactPointerEvent, type RefObject, useEffect, useLayoutEffect, useState } from 'react';
import { getDefaultStore, useAtom, useAtomValue } from 'jotai';
import { useSnapshot } from 'valtio';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { selectFromDiagram, sourceLink } from '@/store/6-source-render-links';
import { classifyMermaidSource, isFlowchartDiagramType, readNodeLabel } from '../catalog/1-flowchart-source';
import { addNode, connectNodes, deleteEdge, deleteNode, reconnectEdge, renameNode } from '../catalog/2-source-patch';
import { applyMmdPatchResult } from '../catalog/4-apply-patch';
import { catalogEdgeKey, mermaidIdFromDomId, parseCatalogEdgeKey } from '../catalog/3-catalog-mmd';
import {
    applyMmdLayout,
    clientDeltaToSvg,
    clientPointInOverlay,
    measureMmdEdges,
    measureMmdNodeBoxes,
    originOfNode,
    type MmdEdgeHit,
    type MmdHitBox,
} from '../catalog/5-mmd-layout';
import { mmdDiagram } from '../store/1-mmd-diagram';
import { mmdLayout, setMmdNodePos } from '../store/4-mmd-layout';
import { mmdSettings } from '../store/2-mmd-settings';
import { mmdInlineEditAtom, mmdNodeDraggingAtom, mmdPaletteShapeAtom, mmdPanModeAtom, mmdZoomAtom } from '../store/3-mmd-ui';

const DRAG_SLOP_PX = 4;
const HANDLE_SIZE = 14;
const EDGE_HANDLE_SIZE = 14;
const HIT_PAD = 2;

export type MmdEditOverlayProps = {
    hostRef: RefObject<HTMLElement | null>;
    contentRef: RefObject<HTMLElement | null>;
    enabled: boolean;
    active?: boolean;
    layoutKey?: string;
};

type DragLine = { x1: number; y1: number; x2: number; y2: number; };

const HANDLES: { side: 'top' | 'right' | 'bottom' | 'left'; }[] = [
    { side: 'top' },
    { side: 'right' },
    { side: 'bottom' },
    { side: 'left' },
];

export function MmdEditOverlay({ hostRef, contentRef, enabled, active = true, layoutKey = '' }: MmdEditOverlayProps) {
    const { source } = useSnapshot(mermaidSettings);
    const { svg, diagramType } = useSnapshot(mmdDiagram);
    const { autofit } = useSnapshot(mmdSettings);
    const link = useSnapshot(sourceLink);
    const layout = useSnapshot(mmdLayout);
    const zoom = useAtomValue(mmdZoomAtom);
    const panMode = useAtomValue(mmdPanModeAtom);
    const shape = useAtomValue(mmdPaletteShapeAtom);
    const dragging = useAtomValue(mmdNodeDraggingAtom);
    const [inline, setInline] = useAtom(mmdInlineEditAtom);
    const [boxes, setBoxes] = useState<MmdHitBox[]>([]);
    const [edges, setEdges] = useState<MmdEdgeHit[]>([]);
    const [connect, setConnect] = useState<DragLine | null>(null);

    const flowchart = classifyMermaidSource(source) === 'flowchart' || isFlowchartDiagramType(diagramType);
    const selection = enabled && flowchart ? selectionFromKeys(link.keys as string[]) : { nodeId: null, edge: null };
    const selectedId = selection.nodeId;
    const selectedEdgeKey = selection.edge?.key ?? null;
    const interactive = enabled && flowchart && active;

    useLayoutEffect(
        () => {
            if (!enabled || !flowchart || !active) {
                return;
            }

            let cancelled = false;
            let raf = 0;
            let attempts = 0;
            let ro: ResizeObserver | undefined;

            function syncBoxes(): boolean {
                const pane = hostRef.current;
                const live = contentRef.current;
                if (cancelled || !pane || !live || !pane.getClientRects().length) {
                    return false;
                }
                applyMmdLayout(live, mmdLayout.nodes);
                const nextBoxes = measureMmdNodeBoxes(live, pane).map(padHitBox);
                const nextEdges = measureMmdEdges(live, pane);
                setBoxes(nextBoxes);
                setEdges(nextEdges);
                return nextBoxes.length > 0;
            }

            function observe() {
                const pane = hostRef.current;
                const live = contentRef.current;
                if (!pane || !live || ro) {
                    return;
                }
                ro = new ResizeObserver(() => {
                    syncBoxes();
                });
                ro.observe(pane);
                ro.observe(live);
                const svgEl = live.querySelector('svg');
                if (svgEl) {
                    ro.observe(svgEl);
                }
                if (pane.parentElement) {
                    ro.observe(pane.parentElement);
                }
            }

            function pump() {
                if (cancelled) {
                    return;
                }
                observe();
                if (syncBoxes() || attempts >= 60) {
                    return;
                }
                attempts += 1;
                raf = requestAnimationFrame(pump);
            }

            pump();
            const timeout = window.setTimeout(pump, 400);
            void document.fonts?.ready.then(() => {
                if (!cancelled) {
                    observe();
                    syncBoxes();
                }
            });

            return () => {
                cancelled = true;
                cancelAnimationFrame(raf);
                ro?.disconnect();
                window.clearTimeout(timeout);
            };
        },
        [active, autofit, contentRef, enabled, flowchart, hostRef, layout.nodes, layoutKey, svg, zoom],
    );

    useEffect(
        () => {
            if (!interactive) {
                return;
            }
            function onKeyDown(e: KeyboardEvent) {
                if (e.key !== 'Delete' && e.key !== 'Backspace') {
                    return;
                }
                if (isTypingTarget(e.target) || inline) {
                    return;
                }
                if (selectedEdgeKey) {
                    const edge = parseCatalogEdgeKey(selectedEdgeKey);
                    if (edge) {
                        e.preventDefault();
                        applyMmdPatchResult(deleteEdge(mermaidSettings.source, edge.from, edge.to, edge.label));
                    }
                    return;
                }
                if (!selectedId) {
                    return;
                }
                e.preventDefault();
                applyMmdPatchResult(deleteNode(mermaidSettings.source, selectedId));
            }
            window.addEventListener('keydown', onKeyDown);
            return () => window.removeEventListener('keydown', onKeyDown);
        },
        [inline, interactive, selectedEdgeKey, selectedId],
    );

    if (!interactive) {
        return inline && enabled
            ? <InlineLabelEditor onClose={() => setInline(null)} />
            : null;
    }

    const selected = selectedId ? boxes.find((box) => box.id === selectedId) : undefined;
    const selectedEdge = selectedEdgeKey ? edges.find((edge) => edge.key === selectedEdgeKey) : undefined;

    function onEdgePointerDown(e: ReactPointerEvent<SVGPolylineElement>, key: string) {
        if (e.button !== 0) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        selectFromDiagram([key]);
    }

    function onEndpointPointerDown(e: ReactPointerEvent<HTMLButtonElement>, edge: MmdEdgeHit, which: 'from' | 'to') {
        if (e.button !== 0 || panMode) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        const host = hostRef.current;
        if (!host || edge.points.length < 2) {
            return;
        }
        const anchor = which === 'from' ? edge.points[edge.points.length - 1]! : edge.points[0]!;
        const parsed = parseCatalogEdgeKey(edge.key);
        const overlayHost = host;
        setConnect({ x1: anchor.x, y1: anchor.y, x2: anchor.x, y2: anchor.y });
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        }
        catch {
            // window listeners below still receive the drag
        }

        function move(ev: PointerEvent | MouseEvent) {
            const pt = clientPointInOverlay(overlayHost, ev.clientX, ev.clientY);
            setConnect({ x1: anchor.x, y1: anchor.y, x2: pt.x, y2: pt.y });
        }

        function up(ev: PointerEvent | MouseEvent) {
            setConnect(null);
            const hit = nodeIdFromPoint(ev.clientX, ev.clientY, which === 'from' ? edge.to : edge.from);
            if (!hit || !parsed) {
                return;
            }
            const nextFrom = which === 'from' ? hit : edge.from;
            const nextTo = which === 'to' ? hit : edge.to;
            if (applyMmdPatchResult(reconnectEdge(mermaidSettings.source, edge.from, edge.to, nextFrom, nextTo, parsed.label))) {
                selectFromDiagram([catalogEdgeKey(nextFrom, nextTo, parsed.label)]);
            }
        }

        watchDrag(move, up);
    }

    function onNodePointerDown(e: ReactPointerEvent<HTMLButtonElement>, id: string) {
        if (e.button !== 0) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        selectFromDiagram([`node:${id}`]);
        if (panMode) {
            return;
        }
        const root = contentRef.current;
        const svgEl = root?.querySelector('svg');
        const nodeEl = root ? nodeElementById(root, id) : null;
        if (!root || !(svgEl instanceof SVGSVGElement) || !(nodeEl instanceof Element)) {
            return;
        }
        const liveSvg = svgEl;
        const handle = e.currentTarget;
        const start = {
            x: e.clientX,
            y: e.clientY,
            pos: mmdLayout.nodes[id] ?? originOfNode(nodeEl),
        };
        let moved = false;
        try {
            handle.setPointerCapture(e.pointerId);
        }
        catch {
            // window listeners below still receive the drag
        }
        const store = getDefaultStore();

        function move(ev: PointerEvent | MouseEvent) {
            const dx = ev.clientX - start.x;
            const dy = ev.clientY - start.y;
            if (!moved) {
                if (dx * dx + dy * dy < DRAG_SLOP_PX * DRAG_SLOP_PX) {
                    return;
                }
                moved = true;
                store.set(mmdNodeDraggingAtom, true);
            }
            const delta = clientDeltaToSvg(liveSvg, dx, dy);
            setMmdNodePos(id, { x: start.pos.x + delta.dx, y: start.pos.y + delta.dy });
        }

        function up() {
            store.set(mmdNodeDraggingAtom, false);
        }

        watchDrag(move, up);
    }

    function onHandlePointerDown(e: ReactPointerEvent<HTMLButtonElement>, fromId: string, box: MmdHitBox, side: 'top' | 'right' | 'bottom' | 'left') {
        e.preventDefault();
        e.stopPropagation();
        const host = hostRef.current;
        if (!host) {
            return;
        }
        const origin = handleCenter(box, side);
        const overlayHost = host;
        setConnect({ x1: origin.x, y1: origin.y, x2: origin.x, y2: origin.y });
        const handle = e.currentTarget;
        try {
            handle.setPointerCapture(e.pointerId);
        }
        catch {
            // window listeners below still receive the drag
        }

        function move(ev: PointerEvent | MouseEvent) {
            const pt = clientPointInOverlay(overlayHost, ev.clientX, ev.clientY);
            setConnect({ x1: origin.x, y1: origin.y, x2: pt.x, y2: pt.y });
        }

        function up(ev: PointerEvent | MouseEvent) {
            setConnect(null);
            const pt = clientPointInOverlay(overlayHost, ev.clientX, ev.clientY);
            const dx = pt.x - origin.x;
            const dy = pt.y - origin.y;
            if (dx * dx + dy * dy < 64) {
                applyMmdPatchResult(addNode(mermaidSettings.source, { shape, fromId }));
                return;
            }
            const toId = nodeIdFromPoint(ev.clientX, ev.clientY, fromId);
            if (toId) {
                applyMmdPatchResult(connectNodes(mermaidSettings.source, fromId, toId));
            }
        }

        watchDrag(move, up);
    }

    function onDoubleClick(id: string, box: MmdHitBox) {
        setInline({
            id,
            text: readNodeLabel(mermaidSettings.source, id),
            x: box.x,
            y: box.y,
            w: Math.max(box.w, 72),
        });
    }

    const lineLen = connect ? Math.hypot(connect.x2 - connect.x1, connect.y2 - connect.y1) : 0;
    const lineAngle = connect ? Math.atan2(connect.y2 - connect.y1, connect.x2 - connect.x1) : 0;

    return (
        <>
            <svg className="absolute inset-0 z-4 overflow-visible pointer-events-none" width="100%" height="100%">
                {edges.map((edge) => {
                    const selectedLine = edge.key === selectedEdgeKey;
                    return (
                        <g key={edge.key}>
                            <polyline
                                data-mmd-edge={edge.key}
                                className="mmd-edge-hit"
                                points={pointsAttr(edge.points)}
                                fill="none"
                                stroke="transparent"
                                strokeWidth={14}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                pointerEvents="stroke"
                                onPointerDown={(e) => onEdgePointerDown(e, edge.key)}
                            />
                            {selectedLine && (
                                <polyline
                                    className="mmd-edge-selected"
                                    points={pointsAttr(edge.points)}
                                    fill="none"
                                    stroke="var(--primary)"
                                    strokeWidth={3.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    pointerEvents="none"
                                />
                            )}
                        </g>
                    );
                })}
            </svg>
            {boxes.map((box) => {
                const selectedBox = box.id === selectedId;
                return (
                    <button
                        key={box.id}
                        type="button"
                        data-mmd-hit=""
                        data-mmd-id={box.id}
                        aria-label={`Select ${box.id}`}
                        aria-pressed={selectedBox}
                        title="Drag to move. Double-click to rename."
                        className="mmd-hit absolute z-5 rounded-sm bg-transparent cursor-grab active:cursor-grabbing pointer-events-auto"
                        style={{
                            left: box.x,
                            top: box.y,
                            width: box.w,
                            height: box.h,
                            boxShadow: selectedBox ? '0 0 0 2px var(--primary)' : undefined,
                        }}
                        onPointerDown={(e) => onNodePointerDown(e, box.id)}
                        onDoubleClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDoubleClick(box.id, box);
                        }}
                    />
                );
            })}
            {selected && !dragging && !selectedEdge && HANDLES.map(({ side }) => {
                const pos = handleStyle(selected, side);
                return (
                    <button
                        key={side}
                        type="button"
                        data-mmd-chrome=""
                        className="mmd-add-handle absolute z-10 rounded-full bg-primary pointer-events-auto"
                        style={{ left: pos.x, top: pos.y, width: HANDLE_SIZE, height: HANDLE_SIZE }}
                        title="Drag to another block to connect, or click to add a block"
                        onPointerDown={(e) => onHandlePointerDown(e, selected.id, selected, side)}
                        onDoubleClick={(e) => e.stopPropagation()}
                    />
                );
            })}
            {selectedEdge && !dragging && (
                <>
                    <EndpointHandle
                        pt={selectedEdge.points[0]!}
                        label={`Move start of ${selectedEdge.from} → ${selectedEdge.to}`}
                        onPointerDown={(e) => onEndpointPointerDown(e, selectedEdge, 'from')}
                    />
                    <EndpointHandle
                        pt={selectedEdge.points[selectedEdge.points.length - 1]!}
                        label={`Move end of ${selectedEdge.from} → ${selectedEdge.to}`}
                        onPointerDown={(e) => onEndpointPointerDown(e, selectedEdge, 'to')}
                    />
                </>
            )}
            {connect && (
                <div
                    data-mmd-chrome=""
                    className="mmd-connect-line absolute z-10 h-0.5 bg-primary"
                    style={{
                        left: connect.x1,
                        top: connect.y1,
                        width: lineLen,
                        transform: `rotate(${lineAngle}rad)`,
                    }}
                />
            )}
            {inline && (
                <InlineLabelEditor onClose={() => setInline(null)} />
            )}
        </>
    );
}

function InlineLabelEditor({ onClose }: { onClose: () => void; }) {
    const [inline, setInline] = useAtom(mmdInlineEditAtom);
    if (!inline) {
        return null;
    }

    function commit() {
        if (!inline) {
            return;
        }
        applyMmdPatchResult(renameNode(mermaidSettings.source, inline.id, inline.text));
        setInline(null);
        onClose();
    }

    return (
        <input
            data-mmd-chrome=""
            className="absolute z-20 px-1.5 h-7 text-xs bg-background border border-primary rounded-sm shadow-sm outline-none pointer-events-auto"
            style={{ left: inline.x, top: inline.y, width: inline.w }}
            value={inline.text}
            autoFocus
            onChange={(e) => setInline({ ...inline, text: e.target.value })}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit();
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setInline(null);
                    onClose();
                }
            }}
        />
    );
}

function padHitBox(box: MmdHitBox): MmdHitBox {
    return {
        ...box,
        x: box.x - HIT_PAD,
        y: box.y - HIT_PAD,
        w: box.w + HIT_PAD * 2,
        h: box.h + HIT_PAD * 2,
    };
}

function selectionFromKeys(keys: string[]): { nodeId: string | null; edge: { from: string; to: string; label?: string; key: string; } | null; } {
    const preferEdge = keys[0]?.startsWith('edge:');
    let nodeId: string | null = null;
    let edge: { from: string; to: string; label?: string; key: string; } | null = null;
    for (const key of keys) {
        if (!nodeId && key.startsWith('node:')) {
            nodeId = key.slice('node:'.length);
        }
        if (!edge && key.startsWith('edge:')) {
            const parsed = parseCatalogEdgeKey(key);
            if (parsed) {
                edge = { ...parsed, key };
            }
        }
    }
    if (preferEdge) {
        return { nodeId: null, edge };
    }
    return { nodeId, edge: nodeId ? null : edge };
}

function pointsAttr(points: { x: number; y: number; }[]): string {
    return points.map((pt) => `${pt.x},${pt.y}`).join(' ');
}

function EndpointHandle({
    pt,
    label,
    onPointerDown,
}: {
    pt: { x: number; y: number; };
    label: string;
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
    return (
        <button
            type="button"
            data-mmd-chrome=""
            className="mmd-edge-handle absolute z-10 rounded-full bg-background pointer-events-auto"
            style={{
                left: pt.x - EDGE_HANDLE_SIZE / 2,
                top: pt.y - EDGE_HANDLE_SIZE / 2,
                width: EDGE_HANDLE_SIZE,
                height: EDGE_HANDLE_SIZE,
            }}
            title={label}
            aria-label={label}
            onPointerDown={onPointerDown}
            onDoubleClick={(e) => e.stopPropagation()}
        />
    );
}

function handleCenter(box: MmdHitBox, side: 'top' | 'right' | 'bottom' | 'left') {
    switch (side) {
        case 'top':
            return { x: box.x + box.w / 2, y: box.y };
        case 'right':
            return { x: box.x + box.w, y: box.y + box.h / 2 };
        case 'left':
            return { x: box.x, y: box.y + box.h / 2 };
        default:
            return { x: box.x + box.w / 2, y: box.y + box.h };
    }
}

function handleStyle(box: MmdHitBox, side: 'top' | 'right' | 'bottom' | 'left') {
    const c = handleCenter(box, side);
    return { x: c.x - HANDLE_SIZE / 2, y: c.y - HANDLE_SIZE / 2 };
}

function nodeElementById(root: Element, id: string): Element | null {
    for (const el of root.querySelectorAll('g.node')) {
        if (mermaidIdFromDomId(el.id) === id) {
            return el;
        }
    }
    return null;
}

function nodeIdFromPoint(clientX: number, clientY: number, fromId: string): string | null {
    const stack = document.elementsFromPoint(clientX, clientY);
    for (const el of stack) {
        if (!(el instanceof Element)) {
            continue;
        }
        const hit = el.closest('[data-mmd-id]');
        const id = hit?.getAttribute('data-mmd-id');
        if (id && id !== fromId) {
            return id;
        }
    }
    return null;
}

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    return Boolean(target.closest('input, textarea, select, [contenteditable], .monaco-editor'));
}

function watchDrag(
    move: (ev: PointerEvent | MouseEvent) => void,
    up: (ev: PointerEvent | MouseEvent) => void,
) {
    let done = false;
    let sawPointerMove = false;
    function onMove(ev: PointerEvent | MouseEvent) {
        if (ev.type === 'pointermove') {
            sawPointerMove = true;
        }
        else if (sawPointerMove) {
            return;
        }
        move(ev);
    }
    function onUp(ev: PointerEvent | MouseEvent) {
        if (done) {
            return;
        }
        if (ev.type === 'mouseup' && sawPointerMove) {
            return;
        }
        done = true;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        up(ev);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}
