import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { type Node, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { setRflowNodes } from '../8-store/0-flow-diagram';
import { syncMermaidFromGraph } from '../8-store/1-sync-with-source';
import { FRAME_STROKE, HANDLE_RADIUS, HANDLE_SIZE, type Corner, type FlowBox, frameAround, scaleFromCorner, unionBounds } from './8-selection-frame';

const CORNERS: { corner: Corner; cursor: string; }[] = [
    { corner: 'nw', cursor: 'nwse-resize' },
    { corner: 'ne', cursor: 'nesw-resize' },
    { corner: 'sw', cursor: 'nesw-resize' },
    { corner: 'se', cursor: 'nwse-resize' },
];

export function SelectionFrame() {
    const { project } = useReactFlow();
    const store = useStoreApi();
    const transform = useStore((state) => state.transform);
    const nodeInternals = useStore((state) => state.nodeInternals);
    const selected: FlowBox[] = [];
    nodeInternals.forEach((node) => {
        if (!node.selected || node.hidden) {
            return;
        }
        const abs = node.positionAbsolute ?? node.position;
        const w = node.width ?? 0;
        const h = node.height ?? 0;
        if (w <= 0 || h <= 0) {
            return;
        }
        selected.push({ id: node.id, x: abs.x, y: abs.y, w, h });
    });

    const drag = useRef<{ corner: Corner; start: FlowBox[]; bounds: { x: number; y: number; w: number; h: number; }; } | null>(null);
    const bounds = unionBounds(selected);
    if (!bounds) {
        return null;
    }

    const [tx, ty, zoom] = transform;
    const frame = frameAround(bounds, zoom);
    const left = tx + frame.x * zoom;
    const top = ty + frame.y * zoom;
    const width = frame.w * zoom;
    const height = frame.h * zoom;

    function onHandlePointerDown(event: ReactPointerEvent<HTMLButtonElement>, corner: Corner) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { corner, start: selected.map((box) => ({ ...box })), bounds: { ...bounds! } };
    }

    function onHandlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
        const session = drag.current;
        if (!session) {
            return;
        }
        const pane = event.currentTarget.closest('.react-flow')?.getBoundingClientRect();
        if (!pane) {
            return;
        }
        const pointer = project({ x: event.clientX - pane.left, y: event.clientY - pane.top });
        const scaled = scaleFromCorner(session.start, session.bounds, session.corner, pointer);
        applyScaledBoxes(scaled);
    }

    function onHandlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
        if (!drag.current) {
            return;
        }
        drag.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
        syncMermaidFromGraph();
    }

    function applyScaledBoxes(scaled: FlowBox[]) {
        const internals = store.getState().nodeInternals;
        const nextAbs = new Map(scaled.map((box) => [box.id, box]));
        const nodes = store.getState().getNodes().map((node) => {
            const box = nextAbs.get(node.id);
            if (!box) {
                return node;
            }
            let x = box.x;
            let y = box.y;
            const parentId = node.parentNode;
            if (parentId) {
                const parentBox = nextAbs.get(parentId);
                const parent = internals.get(parentId);
                const parentAbs = parentBox ?? parent?.positionAbsolute ?? parent?.position;
                if (parentAbs) {
                    x -= parentAbs.x;
                    y -= parentAbs.y;
                }
            }
            return {
                ...node,
                position: { x, y },
                width: box.w,
                height: box.h,
                style: { ...node.style, width: box.w, height: box.h },
            } satisfies Node;
        });
        setRflowNodes(nodes);
    }

    return (
        <div className="absolute inset-0 z-10 pointer-events-none">
            <div
                className="absolute border-[#4c8dff] pointer-events-none"
                style={{
                    left,
                    top,
                    width,
                    height,
                    borderWidth: FRAME_STROKE,
                    borderStyle: 'solid',
                    boxSizing: 'border-box',
                }}
            >
                {CORNERS.map(({ corner, cursor }) => (
                    <button
                        key={corner}
                        type="button"
                        aria-label={`Scale selection from ${corner}`}
                        className="absolute bg-white border-[#4c8dff] pointer-events-auto"
                        style={{
                            width: HANDLE_SIZE,
                            height: HANDLE_SIZE,
                            borderWidth: FRAME_STROKE,
                            borderStyle: 'solid',
                            borderRadius: HANDLE_RADIUS,
                            cursor,
                            ...handlePosition(corner),
                        }}
                        onPointerDown={(event) => onHandlePointerDown(event, corner)}
                        onPointerMove={onHandlePointerMove}
                        onPointerUp={onHandlePointerUp}
                    />
                ))}
            </div>
        </div>
    );
}

function handlePosition(corner: Corner): { left?: number; right?: number; top?: number; bottom?: number; transform: string; } {
    const shift = -HANDLE_SIZE / 2;
    switch (corner) {
        case 'nw':
            return { left: 0, top: 0, transform: `translate(${shift}px, ${shift}px)` };
        case 'ne':
            return { right: 0, top: 0, transform: `translate(${-shift}px, ${shift}px)` };
        case 'sw':
            return { left: 0, bottom: 0, transform: `translate(${shift}px, ${-shift}px)` };
        default:
            return { right: 0, bottom: 0, transform: `translate(${-shift}px, ${-shift}px)` };
    }
}
