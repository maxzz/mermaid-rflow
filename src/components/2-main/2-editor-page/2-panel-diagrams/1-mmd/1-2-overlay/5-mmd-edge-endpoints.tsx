import { type Dispatch, type PointerEvent as ReactPointerEvent, type RefObject, type SetStateAction } from 'react';
import { useAtomValue } from 'jotai';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { selectFromDiagram } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { reconnectEdge } from '../3-catalog/2-source-patch';
import { catalogEdgeKey, parseCatalogEdgeKey } from '../3-catalog/3-catalog-mmd';
import { applyMmdPatchResult } from '../3-catalog/4-apply-patch';
import { clientPointInOverlay, type MmdEdgeHit } from './8-mmd-layout-math';
import { watchDrag } from './8-watch-drag';
import { mmdPanModeAtom } from '../8-store/3-mmd-ui-atoms';

const EDGE_HANDLE_SIZE = 14;

export type DragLine = { x1: number; y1: number; x2: number; y2: number; };

export function MmdEdgeEndpoints({ edge, hostRef, setConnect }: { edge: MmdEdgeHit | undefined; hostRef: RefObject<HTMLElement | null>; setConnect: Dispatch<SetStateAction<DragLine | null>>; }) {
    const panMode = useAtomValue(mmdPanModeAtom);
    if (!edge || panMode || edge.points.length < 2) {
        return null;
    }

    const selected = edge;
    const start = selected.points[0]!;
    const end = selected.points[selected.points.length - 1]!;

    return (<>
        <EndpointHandle
            pt={start}
            label={`Move start of ${selected.from} → ${selected.to}`}
            onPointerDown={(e) => onEndpointPointerDown(e, 'from', { edge: selected, hostRef, setConnect })}
        />
        <EndpointHandle
            pt={end}
            label={`Move end of ${selected.from} → ${selected.to}`}
            onPointerDown={(e) => onEndpointPointerDown(e, 'to', { edge: selected, hostRef, setConnect })}
        />
    </>);
}

function onEndpointPointerDown(
    e: ReactPointerEvent<HTMLButtonElement>,
    which: 'from' | 'to',
    { edge, hostRef, setConnect }: {
        edge: MmdEdgeHit;
        hostRef: RefObject<HTMLElement | null>;
        setConnect: Dispatch<SetStateAction<DragLine | null>>;
    },
) {
    if (e.button !== 0) {
        return;
    }
    e.preventDefault();
    e.stopPropagation();

    const host = hostRef.current;
    if (!host || edge.points.length < 2) {
        return;
    }

    const start = edge.points[0]!;
    const end = edge.points[edge.points.length - 1]!;
    const anchor = which === 'from' ? end : start;
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

function EndpointHandle({ pt, label, onPointerDown }: { pt: { x: number; y: number; }; label: string; onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void; }) {
    return (
        <button
            className="absolute bg-background border-2 border-primary rounded-full shadow-[0_0_0_1px_var(--background)] cursor-grab active:cursor-grabbing pointer-events-auto z-10"
            data-mmd-chrome=""
            data-mmd-edge-handle=""
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
            type="button"
        />
    );
}

export function nodeIdFromPoint(clientX: number, clientY: number, fromId: string): string | null {
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

