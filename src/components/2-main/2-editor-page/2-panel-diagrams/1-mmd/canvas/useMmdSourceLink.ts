import { type RefObject, useLayoutEffect } from 'react';
import { getDefaultStore } from 'jotai';
import { subscribe } from 'valtio';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { mmdPanAtom } from '../store/3-mmd-ui';
import {
    buildSourceIndex,
    clearSelection,
    selectFromDiagram,
    setSourceIndex,
    SOURCE_LINK_HIT_ATTR,
    SOURCE_LINK_KEY_ATTR,
    sourceLink,
    type LinkIntensity,
} from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { catalogMmdSvg, closestMmdTagged } from '../catalog/3-catalog-mmd';
import '../../3-bm/2-diagram/8-highlight.css';

const CARET_CLASS = 'is-source-link-caret';
const CLICK_CLASS = 'is-source-link-click';
const INTERACTIVE_CLASS = 'source-link-interactive';
const CLICK_SLOP_PX = 4;

export type MmdSourceLinkArgs = {
    contentRef: RefObject<HTMLElement | null>;
    hostRef: RefObject<HTMLElement | null>;
    viewportRef: RefObject<HTMLElement | null>;
    enabled: boolean;
    active: boolean;
    output: string;
    panMode: boolean;
};

export function useMmdSourceLink({ contentRef, hostRef, viewportRef, enabled, active, output, panMode }: MmdSourceLinkArgs) {
    const live = enabled && active;

    useLayoutEffect(
        () => {
            const root = contentRef.current;
            if (!live || !root) {
                return;
            }

            const catalog = catalogMmdSvg(root);
            setSourceIndex(buildSourceIndex(mermaidSettings.source, catalog));
            applyHighlight(root, sourceLink.keys, sourceLink.intensity);

            let lastScrollSig = '';
            const unsub = subscribe(sourceLink, () => {
                const next = contentRef.current;
                if (!next) {
                    return;
                }
                applyHighlight(next, sourceLink.keys, sourceLink.intensity);
                lastScrollSig = maybePanIntoView(next, viewportRef.current, lastScrollSig);
            });

            return () => {
                unsub();
            };
        },
        [live, output],
    );

    useLayoutEffect(
        () => {
            contentRef.current?.classList.toggle(INTERACTIVE_CLASS, live && !panMode);
        },
        [live, output, panMode],
    );

    useLayoutEffect(
        () => {
            const host = hostRef.current;
            if (!host || !live) {
                return;
            }
            return attachPanSafeClick(host, viewportRef.current, (target) => {
                if (!(target instanceof Element)) {
                    clearSelection();
                    return;
                }
                const hit = target.closest('[data-mmd-hit], [data-mmd-edge]');
                const edgeKey = hit?.getAttribute('data-mmd-edge');
                if (edgeKey) {
                    selectFromDiagram([edgeKey]);
                    return;
                }
                const hitId = hit?.getAttribute('data-mmd-id');
                if (hitId) {
                    selectFromDiagram([`node:${hitId}`]);
                    return;
                }
                if (target.closest('[data-mmd-chrome]')) {
                    return;
                }
                const tagged = closestMmdTagged(target);
                if (!tagged) {
                    clearSelection();
                    return;
                }
                const key = tagged.getAttribute(SOURCE_LINK_KEY_ATTR);
                if (key) {
                    selectFromDiagram([key]);
                }
            });
        },
        [live, output, panMode],
    );
}

function applyHighlight(root: Element, keys: string[], intensity: LinkIntensity) {
    for (const el of root.querySelectorAll(`.${CARET_CLASS}, .${CLICK_CLASS}`)) {
        el.classList.remove(CARET_CLASS, CLICK_CLASS);
    }
    if (!keys.length) {
        return;
    }
    const cls = intensity === 'click' ? CLICK_CLASS : CARET_CLASS;
    for (const key of keys) {
        const selector = `[${SOURCE_LINK_KEY_ATTR}="${cssAttrEscape(key)}"]:not([${SOURCE_LINK_HIT_ATTR}])`;
        for (const el of root.querySelectorAll(selector)) {
            el.classList.add(cls);
        }
    }
}

function maybePanIntoView(root: Element, viewport: HTMLElement | null, lastSig: string): string {
    if (sourceLink.origin !== 'editor' || sourceLink.intensity !== 'click' || !sourceLink.keys.length) {
        return lastSig;
    }
    const sig = sourceLink.keys.join('|');
    if (sig === lastSig) {
        return lastSig;
    }
    const el = firstHighlighted(root, sourceLink.keys);
    const shape = el?.querySelector('rect, polygon, circle, path, polyline, line, ellipse') ?? el;
    if (shape && viewport) {
        const er = shape.getBoundingClientRect();
        const vr = viewport.getBoundingClientRect();
        const pad = 16;
        let dx = 0;
        let dy = 0;
        if (er.left < vr.left + pad) {
            dx = vr.left + pad - er.left;
        }
        else if (er.right > vr.right - pad) {
            dx = vr.right - pad - er.right;
        }
        if (er.top < vr.top + pad) {
            dy = vr.top + pad - er.top;
        }
        else if (er.bottom > vr.bottom - pad) {
            dy = vr.bottom - pad - er.bottom;
        }
        if (dx || dy) {
            const store = getDefaultStore();
            const pan = store.get(mmdPanAtom);
            store.set(mmdPanAtom, { x: pan.x + dx, y: pan.y + dy });
        }
    }
    return sig;
}

function firstHighlighted(root: Element, keys: string[]): Element | null {
    for (const key of keys) {
        const el = root.querySelector(`[${SOURCE_LINK_KEY_ATTR}="${cssAttrEscape(key)}"]:not([${SOURCE_LINK_HIT_ATTR}])`);
        if (el) {
            return el;
        }
    }
    return null;
}

function attachPanSafeClick(host: HTMLElement, scrollEl: HTMLElement | null, onSelect: (target: EventTarget | null) => void): () => void {
    let down: { x: number; y: number; pointerId: number; } | null = null;
    const upTarget = scrollEl ?? host;

    function onPointerDown(e: PointerEvent) {
        if (e.button !== 0) {
            return;
        }
        down = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    }

    function onPointerUp(e: PointerEvent) {
        if (!down || e.pointerId !== down.pointerId || e.button !== 0) {
            down = null;
            return;
        }
        const dx = e.clientX - down.x;
        const dy = e.clientY - down.y;
        down = null;
        if (dx * dx + dy * dy > CLICK_SLOP_PX * CLICK_SLOP_PX) {
            return;
        }
        onSelect(e.target);
    }

    function onPointerCancel() {
        down = null;
    }

    host.addEventListener('pointerdown', onPointerDown);
    upTarget.addEventListener('pointerup', onPointerUp);
    upTarget.addEventListener('pointercancel', onPointerCancel);

    return () => {
        host.removeEventListener('pointerdown', onPointerDown);
        upTarget.removeEventListener('pointerup', onPointerUp);
        upTarget.removeEventListener('pointercancel', onPointerCancel);
    };
}

function cssAttrEscape(value: string): string {
    return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value.replace(/"/g, '\\"');
}
