import { type PointerEvent as ReactPointerEvent, type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getDefaultStore, useAtom, useAtomValue } from 'jotai';
import { subscribe, useSnapshot } from 'valtio';
import { classNames } from '@/utils';
import { mermaidSettings } from '@/store/2-mermaid-settings';

import { selectFromDiagram, sourceLink } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { classifyMermaidSource, isFlowchartDiagramType, readNodeLabel } from '../3-catalog/1-flowchart-source';
import { addNode, connectNodes, deleteEdge, deleteNode, reconnectEdge, renameNode } from '../3-catalog/2-source-patch';
import { applyMmdPatchResult } from '../3-catalog/4-apply-patch';
import { catalogEdgeKey, mermaidIdFromDomId, parseCatalogEdgeKey } from '../3-catalog/3-catalog-mmd';
import {
    type MmdEdgeHit,
    type MmdHitBox,
    type MmdNodePos,
    applyMmdLayout,
    applyMmdNodeDrag,
    bakeMmdDragEdges,
    clientDeltaToSvg,
    clientPointInOverlay,
    measureMmdEdges,
    measureMmdNodeBoxes,
    originOfNode,
    mmdDragLinkPreviews,
    overlayScale,
} from './8-mmd-layout-math';
import { alignDragBox, type GuideBox } from '../3-catalog/7-drag-guides';
import { mmdDiagram } from '../8-store/1-mmd-diagram';
import { mmdLayout, setMmdNodePos } from '../8-store/4-mmd-layout';
import { mmdSettings } from '../8-store/2-mmd-settings';
import { mmdDragOverlayAtom, mmdInlineEditAtom, mmdNodeDraggingAtom, mmdPaletteShapeAtom, mmdPanModeAtom, mmdZoomAtom } from '../8-store/3-mmd-ui-atoms';

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

export function MmdEditOverlay({ hostRef, contentRef, enabled, active = true, layoutKey = '' }: MmdEditOverlayProps) {
    const { source } = useSnapshot(mermaidSettings);
    const { svg, diagramType } = useSnapshot(mmdDiagram);
    const { autofit } = useSnapshot(mmdSettings);
    const link = useSnapshot(sourceLink);

    const zoom = useAtomValue(mmdZoomAtom);
    const panMode = useAtomValue(mmdPanModeAtom);
    const shape = useAtomValue(mmdPaletteShapeAtom);
    const [inline, setInline] = useAtom(mmdInlineEditAtom);

    const [boxes, setBoxes] = useState<MmdHitBox[]>([]);
    const [edges, setEdges] = useState<MmdEdgeHit[]>([]);
    const [connect, setConnect] = useState<DragLine | null>(null);
    
    const draggingRef = useRef(false);

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
                if (cancelled || draggingRef.current || !pane || !live || !pane.getClientRects().length) {
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
            const unsubLayout = subscribe(mmdLayout, () => {
                syncBoxes();
            });
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
                unsubLayout();
            };
        },
        [active, autofit, contentRef, enabled, flowchart, hostRef, layoutKey, svg, zoom]);

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
        [inline, interactive, selectedEdgeKey, selectedId]);

    if (!interactive) {
        return inline && enabled
            ? <InlineLabelEditor onClose={() => setInline(null)} />
            : null;
    }

    const selected = selectedId ? boxes.find((box) => box.id === selectedId) : undefined;
    const selectedEdge = selectedEdgeKey ? edges.find((edge) => edge.key === selectedEdgeKey) : undefined;

    function onEdgePointerDown(e: ReactPointerEvent<SVGPolylineElement>, key: string) {
        if (e.button !== 0 || panMode) {
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
        if (e.button !== 0 || panMode) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        selectFromDiagram([`node:${id}`]);
        const root = contentRef.current;
        const overlayHost = hostRef.current;
        const svgEl = root?.querySelector('svg');
        const nodeEl = root ? nodeElementById(root, id) : null;
        if (!root || !overlayHost || !(svgEl instanceof SVGSVGElement) || !(nodeEl instanceof Element)) {
            return;
        }
        const liveRoot = root;
        const board = overlayHost;
        const liveSvg = svgEl;
        const handle = e.currentTarget;
        const startBox = boxes.find((box) => box.id === id);
        const peerBoxes = boxes.filter((box) => box.id !== id).map(visualBox);
        const nodes = { ...mmdLayout.nodes };
        const start = {
            x: e.clientX,
            y: e.clientY,
            pos: nodes[id] ?? originOfNode(nodeEl),
            scale: clientDeltaToSvg(liveSvg, 1, 1),
            overlay: overlayScale(board),
        };
        let moved = false;
        let lastPos: MmdNodePos = start.pos;
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
                draggingRef.current = true;
                board.classList.add('is-mmd-dragging');
                store.set(mmdNodeDraggingAtom, true);
            }
            let snapDx = 0;
            let snapDy = 0;
            let guides: { x1: number; y1: number; x2: number; y2: number; }[] = [];
            if (startBox) {
                const visual = visualBox({
                    x: startBox.x + dx / start.overlay.x,
                    y: startBox.y + dy / start.overlay.y,
                    w: startBox.w,
                    h: startBox.h,
                });
                const aligned = alignDragBox(visual, peerBoxes);
                snapDx = aligned.box.x - visual.x;
                snapDy = aligned.box.y - visual.y;
                guides = aligned.guides;
            }
            const snap = clientDeltaToSvg(liveSvg, snapDx * start.overlay.x, snapDy * start.overlay.y);
            lastPos = {
                x: start.pos.x + dx * start.scale.dx + snap.dx,
                y: start.pos.y + dy * start.scale.dy + snap.dy,
            };
            applyMmdNodeDrag(liveRoot, id, lastPos, nodes);
            if (startBox) {
                handle.style.left = `${startBox.x + dx / start.overlay.x + snapDx}px`;
                handle.style.top = `${startBox.y + dy / start.overlay.y + snapDy}px`;
            }
            store.set(mmdDragOverlayAtom, {
                links: mmdDragLinkPreviews(liveRoot, board),
                guides,
            });
        }

        function up() {
            draggingRef.current = false;
            board.classList.remove('is-mmd-dragging');
            store.set(mmdNodeDraggingAtom, false);
            store.set(mmdDragOverlayAtom, null);
            if (moved) {
                bakeMmdDragEdges(liveRoot, { ...nodes, [id]: lastPos });
                setMmdNodePos(id, lastPos);
            }
        }

        watchDrag(move, up);
    }

    function onHandlePointerDown(e: ReactPointerEvent<HTMLButtonElement>, fromId: string, box: MmdHitBox, side: 'top' | 'right' | 'bottom' | 'left') {
        if (panMode) {
            return;
        }
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

    return (<>
        <svg className="absolute inset-0 z-4 overflow-visible pointer-events-none" width="100%" height="100%">
            {edges.map(
                (edge) => {
                    const selectedLine = edge.key === selectedEdgeKey;
                    return (
                        <g key={edge.key}>
                            <polyline
                                data-mmd-edge={edge.key}
                                className="hover:stroke-primary/45 cursor-pointer [pointer-events:stroke]"
                                points={pointsAttr(edge.points)}
                                fill="none"
                                stroke="transparent"
                                strokeWidth={14}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                pointerEvents={panMode ? 'none' : 'stroke'}
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
                }
            )}
        </svg>

        {boxes.map(
            (box) => {
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
                        className={classNames(
                            'absolute z-5 rounded-sm bg-transparent hover:shadow-[0_0_0_2px_color-mix(in_oklab,var(--primary)_50%,transparent)] touch-none cursor-grab active:cursor-grabbing',
                            panMode ? 'pointer-events-none' : 'pointer-events-auto',
                        )}
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
            }
        )}

        {selected && !selectedEdge && !panMode && HANDLES.map(
            ({ side }) => {
                const pos = handleStyle(selected, side);
                return (
                    <button
                        key={side}
                        type="button"
                        data-mmd-chrome=""
                        data-mmd-add-handle=""
                        className="absolute z-10 rounded-full bg-primary shadow-[0_0_0_2px_var(--background)] pointer-events-auto"
                        style={{ left: pos.x, top: pos.y, width: HANDLE_SIZE, height: HANDLE_SIZE }}
                        title="Drag to another block to connect, or click to add a block"
                        onPointerDown={(e) => onHandlePointerDown(e, selected.id, selected, side)}
                        onDoubleClick={(e) => e.stopPropagation()}
                    />
                );
            }
        )}

        {selectedEdge && !panMode && (<>
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
        </>)}

        <MmdDragOverlay />

        {connect && (
            <div
                className="absolute z-10 h-0.5 origin-[0_50%] bg-primary pointer-events-none"
                style={{ left: connect.x1, top: connect.y1, width: lineLen, transform: `rotate(${lineAngle}rad)` }}
                data-mmd-chrome=""
            />
        )}

        {inline && (
            <InlineLabelEditor onClose={() => setInline(null)} />
        )}
    </>);
}

const HANDLES: { side: 'top' | 'right' | 'bottom' | 'left'; }[] = [
    { side: 'top' },
    { side: 'right' },
    { side: 'bottom' },
    { side: 'left' },
];

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

function MmdDragOverlay() {
    const drag = useAtomValue(mmdDragOverlayAtom);
    if (!drag || (!drag.links.length && !drag.guides.length)) {
        return null;
    }

    return (
        <svg className="absolute inset-0 overflow-visible pointer-events-none z-6" width="100%" height="100%">
            <defs>
                <marker id="mmd-drag-arrow" viewBox="0 0 10 10" markerWidth="7" markerHeight="7" refX="8" refY="5" orient="auto">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="context-stroke" />
                </marker>
            </defs>
            {drag.links.map((link, index) => (
                <polyline
                    key={`${link.key}-${index}`}
                    points={link.points.map((pt) => `${pt.x},${pt.y}`).join(' ')}
                    fill="none"
                    stroke={link.color}
                    strokeWidth={1.75}
                    strokeDasharray="7 5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    markerEnd="url(#mmd-drag-arrow)"
                />
            ))}
            {drag.guides.map((guide, index) => (
                <line
                    key={`${guide.x1}-${guide.y1}-${guide.x2}-${guide.y2}-${index}`}
                    x1={guide.x1}
                    y1={guide.y1}
                    x2={guide.x2}
                    y2={guide.y2}
                    stroke="var(--primary)"
                    strokeWidth={1.25}
                    shapeRendering="crispEdges"
                />
            ))}
        </svg>
    );
}

function visualBox(box: { x: number; y: number; w: number; h: number; }): GuideBox {
    return {
        x: box.x + HIT_PAD,
        y: box.y + HIT_PAD,
        w: Math.max(1, box.w - HIT_PAD * 2),
        h: Math.max(1, box.h - HIT_PAD * 2),
    };
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
    } else {
        return { nodeId, edge: nodeId ? null : edge };
    }
}

function pointsAttr(points: { x: number; y: number; }[]): string {
    return points.map((pt) => `${pt.x},${pt.y}`).join(' ');
}

function EndpointHandle({ pt, label, onPointerDown, }: { pt: { x: number; y: number; }; label: string; onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void; }) {
    return (
        <button
            type="button"
            data-mmd-chrome=""
            data-mmd-edge-handle=""
            className="absolute z-10 rounded-full bg-background border-2 border-primary shadow-[0_0_0_1px_var(--background)] cursor-grab active:cursor-grabbing pointer-events-auto"
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

//---------------------------------------------------------------------------


function handleStyle(box: MmdHitBox, side: 'top' | 'right' | 'bottom' | 'left') {
    const c = handleCenter(box, side);
    return { x: c.x - HANDLE_SIZE / 2, y: c.y - HANDLE_SIZE / 2 };
}

function handleCenter(box: MmdHitBox, side: 'top' | 'right' | 'bottom' | 'left') {
    switch (side) {
        case 'top': return { x: box.x + box.w / 2, y: box.y };
        case 'right': return { x: box.x + box.w, y: box.y + box.h / 2 };
        case 'left': return { x: box.x, y: box.y + box.h / 2 };
        default: return { x: box.x + box.w / 2, y: box.y + box.h };
    }
}

//---------------------------------------------------------------------------

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

//---------------------------------------------------------------------------

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    return Boolean(target.closest('input, textarea, select, [contenteditable], .monaco-editor'));
}

function watchDrag(move: (ev: PointerEvent | MouseEvent) => void, up: (ev: PointerEvent | MouseEvent) => void) {
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

        abortController.abort();
        up(ev);
    }

    const abortController = new AbortController();
    window.addEventListener('pointermove', onMove, { signal: abortController.signal });
    window.addEventListener('pointerup', onUp, { signal: abortController.signal });
    window.addEventListener('pointercancel', onUp, { signal: abortController.signal });
    window.addEventListener('mousemove', onMove, { signal: abortController.signal });
    window.addEventListener('mouseup', onUp, { signal: abortController.signal });
}
