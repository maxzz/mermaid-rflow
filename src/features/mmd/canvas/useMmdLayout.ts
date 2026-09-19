import { type RefObject, useLayoutEffect } from 'react';
import { getDefaultStore } from 'jotai';
import { subscribe } from 'valtio';
import { selectFromDiagram, SOURCE_LINK_KEY_ATTR } from '@/store/6-source-render-links';
import { closestMmdTagged, mermaidIdFromDomId } from '../catalog/3-catalog-mmd';
import {
    applyMmdLayout,
    clientDeltaToSvg,
    collectMmdNodeIds,
    originOfNode,
} from '../catalog/5-mmd-layout';
import { mmdLayout, pruneMmdLayout, setMmdNodePos } from '../store/4-mmd-layout';
import { mmdNodeDraggingAtom } from '../store/3-mmd-ui';

const DRAG_SLOP_PX = 4;

export type MmdLayoutArgs = {
    contentRef: RefObject<HTMLElement | null>;
    hostRef: RefObject<HTMLElement | null>;
    enabled: boolean;
    flowchart: boolean;
    panMode: boolean;
    output: string;
};

export function useMmdLayout({ contentRef, hostRef, enabled, flowchart, panMode, output }: MmdLayoutArgs) {
    useLayoutEffect(
        () => {
            const root = contentRef.current;
            if (!enabled || !root) {
                return;
            }
            pruneMmdLayout(collectMmdNodeIds(root));
            applyMmdLayout(root, mmdLayout.nodes);
            return subscribe(mmdLayout, () => {
                const live = contentRef.current;
                if (live) {
                    applyMmdLayout(live, mmdLayout.nodes);
                }
            });
        },
        [contentRef, enabled, output],
    );

    useLayoutEffect(
        () => {
            const pane = hostRef.current;
            if (!pane || !enabled || !flowchart || panMode) {
                return;
            }
            return bindMmdNodeDrag(pane, contentRef);
        },
        [contentRef, enabled, flowchart, hostRef, panMode],
    );
}

function bindMmdNodeDrag(pane: HTMLElement, contentRef: RefObject<HTMLElement | null>): () => void {
    let drag: {
        pointerId: number;
        id: string;
        startX: number;
        startY: number;
        pos: { x: number; y: number; };
        moved: boolean;
    } | null = null;
    const store = getDefaultStore();

    function onPointerDown(e: PointerEvent) {
        if (e.button !== 0) {
            return;
        }
        if (e.target instanceof Element && e.target.closest('[data-mmd-chrome]')) {
            return;
        }
        const tagged = closestMmdTagged(e.target);
        const key = tagged?.getAttribute(SOURCE_LINK_KEY_ATTR) ?? '';
        if (!key.startsWith('node:') || !(tagged instanceof Element)) {
            return;
        }
        const root = contentRef.current;
        const svg = root?.querySelector('svg');
        if (!root || !(svg instanceof SVGSVGElement)) {
            return;
        }
        const id = key.slice('node:'.length) || mermaidIdFromDomId(tagged.id);
        if (!id) {
            return;
        }
        selectFromDiagram([`node:${id}`]);
        drag = {
            pointerId: e.pointerId,
            id,
            startX: e.clientX,
            startY: e.clientY,
            pos: mmdLayout.nodes[id] ?? originOfNode(tagged),
            moved: false,
        };
    }

    function onPointerMove(e: PointerEvent) {
        if (!drag) {
            return;
        }
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (!drag.moved) {
            if (dx * dx + dy * dy < DRAG_SLOP_PX * DRAG_SLOP_PX) {
                return;
            }
            drag.moved = true;
            store.set(mmdNodeDraggingAtom, true);
            try {
                pane.setPointerCapture(e.pointerId);
            }
            catch {
                // Synthetic or already-captured pointers still move on the host.
            }
            pane.classList.add('is-mmd-dragging');
        }
        const root = contentRef.current;
        const svg = root?.querySelector('svg');
        if (!(svg instanceof SVGSVGElement)) {
            return;
        }
        e.preventDefault();
        const delta = clientDeltaToSvg(svg, dx, dy);
        setMmdNodePos(drag.id, { x: drag.pos.x + delta.dx, y: drag.pos.y + delta.dy });
    }

    function onPointerUp(e: PointerEvent) {
        if (!drag) {
            return;
        }
        if (drag.moved) {
            try {
                pane.releasePointerCapture(e.pointerId);
            }
            catch {
                // already released
            }
        }
        pane.classList.remove('is-mmd-dragging');
        store.set(mmdNodeDraggingAtom, false);
        drag = null;
    }

    pane.addEventListener('pointerdown', onPointerDown);
    pane.addEventListener('pointermove', onPointerMove);
    pane.addEventListener('pointerup', onPointerUp);
    pane.addEventListener('pointercancel', onPointerUp);

    return () => {
        pane.removeEventListener('pointerdown', onPointerDown);
        pane.removeEventListener('pointermove', onPointerMove);
        pane.removeEventListener('pointerup', onPointerUp);
        pane.removeEventListener('pointercancel', onPointerUp);
        pane.classList.remove('is-mmd-dragging');
        store.set(mmdNodeDraggingAtom, false);
    };
}
