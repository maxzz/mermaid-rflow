import { type RefObject, useLayoutEffect } from "react";
import { subscribe } from "valtio";
import { mermaidSettings } from "@/store/2-mermaid-settings";
import {
    addHitStrokes,
    catalogSvg,
    clearSelection,
    clearSourceLink,
    closestTagged,
    selectFromDiagram,
    setSourceIndex,
    SOURCE_LINK_HIT_ATTR,
    SOURCE_LINK_KEY_ATTR,
    sourceLink,
    buildSourceIndex,
    type LinkIntensity,
} from "@/store/6-source-render-links";
import "./8-highlight.css";

const CARET_CLASS = "is-source-link-caret";
const CLICK_CLASS = "is-source-link-click";
const INTERACTIVE_CLASS = "source-link-interactive";
const CLICK_SLOP_PX = 4;

export type PreviewSourceLinkArgs = {
    contentRef: RefObject<HTMLElement | null>;
    hostRef: RefObject<HTMLElement | null>;
    scrollRef: RefObject<HTMLElement | null>;
    enabled: boolean;
    output: string;
    panMode: boolean;
};

export function usePreviewSourceLink({ contentRef, hostRef, scrollRef, enabled, output, panMode }: PreviewSourceLinkArgs) {
    useLayoutEffect(
        () => {
            const root = contentRef.current;
            if (!enabled || !root) {
                clearSourceLink();
                return;
            }

            const catalog = catalogSvg(root);
            addHitStrokes(root);
            setSourceIndex(buildSourceIndex(mermaidSettings.source, catalog));
            applyHighlight(root, sourceLink.keys, sourceLink.intensity);

            let lastScrollSig = "";
            const unsub = subscribe(sourceLink, () => {
                const live = contentRef.current;
                if (!live) {
                    return;
                }
                applyHighlight(live, sourceLink.keys, sourceLink.intensity);
                lastScrollSig = maybeScrollIntoView(live, lastScrollSig);
            });

            return () => {
                unsub();
            };
        },
        [enabled, output]);

    useLayoutEffect(
        () => {
            contentRef.current?.classList.toggle(INTERACTIVE_CLASS, enabled && !panMode);
        },
        [enabled, output, panMode]);

    useLayoutEffect(
        () => {
            const host = hostRef.current;
            if (!host || !enabled) {
                return;
            }
            return attachPanSafeClick(host, scrollRef.current, (target) => {
                const tagged = closestTagged(target);
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
        [enabled, output, panMode]);
}

function applyHighlight(root: Element, keys: string[], intensity: LinkIntensity) {
    for (const el of root.querySelectorAll(`.${CARET_CLASS}, .${CLICK_CLASS}`)) {
        el.classList.remove(CARET_CLASS, CLICK_CLASS);
    }
    if (!keys.length) {
        return;
    }
    const cls = intensity === "click" ? CLICK_CLASS : CARET_CLASS;
    for (const key of keys) {
        const selector = `[${SOURCE_LINK_KEY_ATTR}="${cssAttrEscape(key)}"]:not([${SOURCE_LINK_HIT_ATTR}])`;
        for (const el of root.querySelectorAll(selector)) {
            el.classList.add(cls);
        }
    }
}

function maybeScrollIntoView(root: Element, lastSig: string): string {
    if (sourceLink.origin !== "editor" || sourceLink.intensity !== "click" || !sourceLink.keys.length) {
        return lastSig;
    }
    const sig = sourceLink.keys.join("|");
    if (sig === lastSig) {
        return lastSig;
    }
    const el = firstHighlighted(root, sourceLink.keys);
    const shape = el?.querySelector("rect, polygon, circle, path, polyline, line, ellipse") ?? el;
    shape?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
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
        onSelect(resolveClickTarget(e));
    }

    function onPointerCancel() {
        down = null;
    }

    host.addEventListener("pointerdown", onPointerDown);
    upTarget.addEventListener("pointerup", onPointerUp);
    upTarget.addEventListener("pointercancel", onPointerCancel);

    return () => {
        host.removeEventListener("pointerdown", onPointerDown);
        upTarget.removeEventListener("pointerup", onPointerUp);
        upTarget.removeEventListener("pointercancel", onPointerCancel);
    };
}

function resolveClickTarget(e: PointerEvent): EventTarget | null {
    if (closestTagged(e.target)) {
        return e.target;
    }
    return document.elementFromPoint(e.clientX, e.clientY);
}

function cssAttrEscape(value: string): string {
    return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/"/g, '\\"');
}
