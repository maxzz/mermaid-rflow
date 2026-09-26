import { type Dispatch, type PointerEvent as ReactPointerEvent, type RefObject, type SetStateAction } from 'react';
import { useAtomValue } from 'jotai';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { addNode, connectNodes } from '../3-catalog/2-source-patch';
import { applyMmdPatchResult } from '../3-catalog/4-apply-patch';
import { clientPointInOverlay, type MmdHitBox } from './8-mmd-layout-math';
import { mmdPaletteShapeAtom, mmdPanModeAtom } from '../8-store/3-mmd-ui-atoms';
import { type DragLine, nodeIdFromPoint, watchDrag } from './5-mmd-edge-endpoints';

const HANDLE_SIZE = 14;

const HANDLES: { side: 'top' | 'right' | 'bottom' | 'left'; }[] = [
    { side: 'top' },
    { side: 'right' },
    { side: 'bottom' },
    { side: 'left' },
];

export function MmdNodeHandles({
    box,
    hostRef,
    setConnect,
}: {
    box: MmdHitBox | undefined;
    hostRef: RefObject<HTMLElement | null>;
    setConnect: Dispatch<SetStateAction<DragLine | null>>;
}) {
    const panMode = useAtomValue(mmdPanModeAtom);
    const shape = useAtomValue(mmdPaletteShapeAtom);
    if (!box || panMode) {
        return null;
    }

    const selected = box;

    function onHandlePointerDown(e: ReactPointerEvent<HTMLButtonElement>, side: 'top' | 'right' | 'bottom' | 'left') {
        e.preventDefault();
        e.stopPropagation();
        const host = hostRef.current;
        if (!host) {
            return;
        }
        const origin = handleCenter(selected, side);
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
                applyMmdPatchResult(addNode(mermaidSettings.source, { shape, fromId: selected.id }));
                return;
            }
            const toId = nodeIdFromPoint(ev.clientX, ev.clientY, selected.id);
            if (toId) {
                applyMmdPatchResult(connectNodes(mermaidSettings.source, selected.id, toId));
            }
        }

        watchDrag(move, up);
    }

    return (
        <>
            {HANDLES.map(
                ({ side }) => {
                    const pos = handleStyle(selected, side);
                    return (
                        <button
                            key={side}
                            type="button"
                            data-mmd-chrome=""
                            data-mmd-add-handle=""
                            className="absolute bg-primary rounded-full shadow-[0_0_0_2px_var(--background)] pointer-events-auto z-10"
                            style={{ left: pos.x, top: pos.y, width: HANDLE_SIZE, height: HANDLE_SIZE }}
                            title="Drag to another block to connect, or click to add a block"
                            onPointerDown={(e) => onHandlePointerDown(e, side)}
                            onDoubleClick={(e) => e.stopPropagation()}
                        />
                    );
                }
            )}
        </>
    );
}

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
