import { type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { getDefaultStore, useAtomValue, useSetAtom } from 'jotai';
import { classNames } from '@/utils';
import { mermaidSettings } from '@/store/2-mermaid-settings';

import { selectFromDiagram } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { type MmdHitBox, type MmdNodePos, applyMmdNodeDrag, bakeMmdDragEdges, clientDeltaToSvg, mmdDragLinkPreviews, originOfNode, overlayScale } from './8-mmd-layout-math';
import { readNodeLabel } from '../3-catalog/1-flowchart-source';
import { mermaidIdFromDomId } from '../3-catalog/3-catalog-mmd';
import { alignDragBox } from '../3-catalog/7-drag-guides';
import { mmdLayout, setMmdNodePos } from '../8-store/4-mmd-layout';
import { mmdDragOverlayAtom, mmdInlineEditAtom, mmdNodeDraggingAtom, mmdPanModeAtom } from '../8-store/3-mmd-ui-atoms';
import { watchDrag } from './5-mmd-edge-endpoints';

const DRAG_SLOP_PX = 4;
const HIT_PAD = 2;

export function MmdNodeHits({ boxes, selectedId, hostRef, contentRef, draggingRef }: {
    boxes: MmdHitBox[];
    selectedId: string | null;
    hostRef: RefObject<HTMLElement | null>;
    contentRef: RefObject<HTMLElement | null>;
    draggingRef: RefObject<boolean>;
}) {
    const panMode = useAtomValue(mmdPanModeAtom);
    const setInline = useSetAtom(mmdInlineEditAtom);

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

        function move(event: PointerEvent | MouseEvent) {
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;

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

    function onDoubleClick(id: string, box: MmdHitBox) {
        setInline({
            id,
            text: readNodeLabel(mermaidSettings.source, id),
            x: box.x,
            y: box.y,
            w: Math.max(box.w, 72),
        });
    }

    return (<>
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
                            'absolute touch-none bg-transparent hover:shadow-[0_0_0_2px_color-mix(in_oklab,var(--primary)_50%,transparent)] rounded-sm cursor-grab active:cursor-grabbing',
                            panMode ? 'pointer-events-none z-5' : 'pointer-events-auto z-5',
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
    </>);
}

function visualBox(box: { x: number; y: number; w: number; h: number; }) {
    return {
        x: box.x + HIT_PAD,
        y: box.y + HIT_PAD,
        w: Math.max(1, box.w - HIT_PAD * 2),
        h: Math.max(1, box.h - HIT_PAD * 2),
    };
}

function nodeElementById(root: Element, id: string): Element | null {
    for (const el of root.querySelectorAll('g.node')) {
        if (mermaidIdFromDomId(el.id) === id) {
            return el;
        }
    }
    return null;
}
