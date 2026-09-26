import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { subscribe, useSnapshot } from 'valtio';
import { mermaidSettings } from '@/store/2-mermaid-settings';

import { sourceLink } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { classifyMermaidSource, isFlowchartDiagramType } from '../3-catalog/1-flowchart-source';
import { deleteEdge, deleteNode, renameNode } from '../3-catalog/2-source-patch';
import { applyMmdPatchResult } from '../3-catalog/4-apply-patch';
import { parseCatalogEdgeKey } from '../3-catalog/3-catalog-mmd';
import {
    type MmdEdgeHit,
    type MmdHitBox,
    applyMmdLayout,
    measureMmdEdges,
    measureMmdNodeBoxes,
} from './8-mmd-layout-math';
import { mmdDiagram } from '../8-store/1-mmd-diagram';
import { mmdLayout } from '../8-store/4-mmd-layout';
import { mmdSettings } from '../8-store/2-mmd-settings';
import { mmdDragOverlayAtom, mmdInlineEditAtom, mmdZoomAtom } from '../8-store/3-mmd-ui-atoms';
import { MmdEdgeHits } from './3-mmd-edge-hits';
import { MmdNodeHits } from './4-mmd-node-hits';
import { type DragLine, MmdEdgeEndpoints } from './5-mmd-edge-endpoints';
import { MmdNodeHandles } from './6-mmd-node-handles';

const HIT_PAD = 2;

export type MmdEditOverlayProps = {
    hostRef: RefObject<HTMLElement | null>;
    contentRef: RefObject<HTMLElement | null>;
    enabled: boolean;
    active?: boolean;
    layoutKey?: string;
};

export function MmdEditOverlay({ hostRef, contentRef, enabled, active = true, layoutKey = '' }: MmdEditOverlayProps) {
    const { source } = useSnapshot(mermaidSettings);
    const { svg, diagramType } = useSnapshot(mmdDiagram);
    const { autofit } = useSnapshot(mmdSettings);
    const link = useSnapshot(sourceLink);

    const zoom = useAtomValue(mmdZoomAtom);
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

            const abortController = new AbortController();
            window.addEventListener('keydown', onKeyDown, { signal: abortController.signal });
            return () => abortController.abort();
        },
        [inline, interactive, selectedEdgeKey, selectedId]);

    if (!interactive) {
        return inline && enabled ? <InlineLabelEditor onClose={() => setInline(null)} /> : null;
    }

    const selected = selectedId ? boxes.find((box) => box.id === selectedId) : undefined;
    const selectedEdge = selectedEdgeKey ? edges.find((edge) => edge.key === selectedEdgeKey) : undefined;

    const lineLen = connect ? Math.hypot(connect.x2 - connect.x1, connect.y2 - connect.y1) : 0;
    const lineAngle = connect ? Math.atan2(connect.y2 - connect.y1, connect.x2 - connect.x1) : 0;

    return (<>
        <MmdEdgeHits edges={edges} selectedEdgeKey={selectedEdgeKey} />

        <MmdNodeHits
            boxes={boxes}
            selectedId={selectedId}
            hostRef={hostRef}
            contentRef={contentRef}
            draggingRef={draggingRef}
        />

        <MmdNodeHandles box={selectedEdge ? undefined : selected} hostRef={hostRef} setConnect={setConnect} />

        <MmdEdgeEndpoints edge={selectedEdge} hostRef={hostRef} setConnect={setConnect} />

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

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    return Boolean(target.closest('input, textarea, select, [contenteditable], .monaco-editor'));
}

