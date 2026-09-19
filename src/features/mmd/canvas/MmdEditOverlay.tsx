import { type PointerEvent, type RefObject, useEffect, useLayoutEffect, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useSnapshot } from 'valtio';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { SOURCE_LINK_HIT_ATTR, SOURCE_LINK_KEY_ATTR, sourceLink } from '@/store/6-source-render-links';
import { classifyMermaidSource, isFlowchartDiagramType, readNodeLabel } from '../catalog/1-flowchart-source';
import { addNode, connectNodes, deleteNode, renameNode } from '../catalog/2-source-patch';
import { applyMmdPatchResult } from '../catalog/4-apply-patch';
import { closestMmdTagged } from '../catalog/3-catalog-mmd';
import { mmdDiagram } from '../store/1-mmd-diagram';
import { mmdLayout } from '../store/4-mmd-layout';
import { mmdConnectFromAtom, mmdInlineEditAtom, mmdNodeDraggingAtom, mmdPaletteShapeAtom } from '../store/3-mmd-ui';

export type MmdEditOverlayProps = {
    hostRef: RefObject<HTMLElement | null>;
    contentRef: RefObject<HTMLElement | null>;
    enabled: boolean;
};

type Box = { x: number; y: number; w: number; h: number; };
type DragLine = { x1: number; y1: number; x2: number; y2: number; };

export function MmdEditOverlay({ hostRef, contentRef, enabled }: MmdEditOverlayProps) {
    const { source } = useSnapshot(mermaidSettings);
    const { svg, diagramType } = useSnapshot(mmdDiagram);
    const link = useSnapshot(sourceLink);
    const shape = useAtomValue(mmdPaletteShapeAtom);
    const dragging = useAtomValue(mmdNodeDraggingAtom);
    const layout = useSnapshot(mmdLayout);
    const [inline, setInline] = useAtom(mmdInlineEditAtom);
    const [, setConnectFrom] = useAtom(mmdConnectFromAtom);
    const [box, setBox] = useState<Box | null>(null);
    const [drag, setDrag] = useState<DragLine | null>(null);

    const flowchart = classifyMermaidSource(source) === 'flowchart' || isFlowchartDiagramType(diagramType);
    const nodeId = enabled ? firstNodeId(link.keys as string[]) : null;

    useLayoutEffect(
        () => {
            const host = hostRef.current;
            const root = contentRef.current;
            if (!host || !root || !nodeId) {
                setBox(null);
                return;
            }
            const el = root.querySelector(`[${SOURCE_LINK_KEY_ATTR}="${cssEscape(`node:${nodeId}`)}"]:not([${SOURCE_LINK_HIT_ATTR}])`);
            if (!(el instanceof Element)) {
                setBox(null);
                return;
            }
            const next = boxRelative(el, host);
            setBox((prev) => sameBox(prev, next) ? prev : next);
        },
        [contentRef, hostRef, layout.nodes, nodeId, svg, link.keys],
    );

    useEffect(
        () => {
            const host = hostRef.current;
            if (!host || !enabled || !flowchart) {
                return;
            }
            function onDblClick(e: MouseEvent) {
                if (!(e.target instanceof Element) || e.target.closest('[data-mmd-chrome]')) {
                    return;
                }
                const tagged = closestMmdTagged(e.target);
                const id = nodeIdFromKey(tagged?.getAttribute(SOURCE_LINK_KEY_ATTR) ?? '');
                if (!id) {
                    return;
                }
                const pane = hostRef.current;
                if (!pane || !(tagged instanceof Element)) {
                    return;
                }
                e.preventDefault();
                const b = boxRelative(tagged, pane);
                setInline({
                    id,
                    text: readNodeLabel(mermaidSettings.source, id),
                    x: b.x,
                    y: b.y,
                    w: Math.max(b.w, 72),
                });
            }
            host.addEventListener('dblclick', onDblClick);
            return () => host.removeEventListener('dblclick', onDblClick);
        },
        [enabled, flowchart, hostRef, setInline],
    );

    useEffect(
        () => {
            if (!enabled) {
                return;
            }

            function onKeyDown(e: KeyboardEvent) {
                if (e.key !== 'Delete' && e.key !== 'Backspace') {
                    return;
                }
                if (isTypingTarget(e.target) || inline) {
                    return;
                }
                if (!nodeId) {
                    return;
                }
                e.preventDefault();
                applyMmdPatchResult(deleteNode(mermaidSettings.source, nodeId));
            }

            window.addEventListener('keydown', onKeyDown);
            return () => window.removeEventListener('keydown', onKeyDown);
        },
        [enabled, inline, nodeId],
    );

    if (!enabled || !flowchart || !nodeId || !box) {
        return inline && enabled
            ? <InlineLabelEditor onClose={() => setInline(null)} />
            : null;
    }

    const selectedId = nodeId;
    const selectedBox = box;

    function addChild() {
        applyMmdPatchResult(addNode(mermaidSettings.source, { shape, fromId: selectedId }));
    }

    function onHandlePointerDown(e: PointerEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.stopPropagation();
        const paneEl = hostRef.current;
        if (!paneEl) {
            return;
        }
        const paneBox = () => paneEl.getBoundingClientRect();
        const start = { x: selectedBox.x + selectedBox.w / 2, y: selectedBox.y + selectedBox.h + 10 };
        setConnectFrom(selectedId);
        setDrag({ x1: start.x, y1: start.y, x2: start.x, y2: start.y });
        const handle = e.currentTarget;
        handle.setPointerCapture(e.pointerId);

        function move(ev: globalThis.PointerEvent) {
            const rect = paneBox();
            setDrag({ x1: start.x, y1: start.y, x2: ev.clientX - rect.left, y2: ev.clientY - rect.top });
        }

        function up(ev: globalThis.PointerEvent) {
            handle.releasePointerCapture(ev.pointerId);
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', up);
            setDrag(null);
            setConnectFrom(null);
            const origin = paneBox();
            const dx = ev.clientX - (origin.left + start.x);
            const dy = ev.clientY - (origin.top + start.y);
            if (dx * dx + dy * dy < 64) {
                addChild();
                return;
            }
            const target = closestMmdTagged(document.elementFromPoint(ev.clientX, ev.clientY));
            const key = target?.getAttribute(SOURCE_LINK_KEY_ATTR) ?? '';
            const toId = nodeIdFromKey(key);
            if (toId && toId !== selectedId) {
                applyMmdPatchResult(connectNodes(mermaidSettings.source, selectedId, toId));
            }
        }

        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
    }

    const lineLen = drag ? Math.hypot(drag.x2 - drag.x1, drag.y2 - drag.y1) : 0;
    const lineAngle = drag ? Math.atan2(drag.y2 - drag.y1, drag.x2 - drag.x1) : 0;

    return (
        <>
            <div
                data-mmd-chrome=""
                className="absolute border-2 border-primary rounded-sm pointer-events-none"
                style={{ left: selectedBox.x, top: selectedBox.y, width: selectedBox.w, height: selectedBox.h }}
            />
            {!dragging && (
                <button
                    type="button"
                    data-mmd-chrome=""
                    className="mmd-add-handle absolute z-10 size-3 rounded-full bg-primary pointer-events-auto"
                    style={{ left: selectedBox.x + selectedBox.w / 2 - 6, top: selectedBox.y + selectedBox.h + 4 }}
                    title="Add a node, or drag to connect"
                    onPointerDown={onHandlePointerDown}
                    onDoubleClick={(e) => e.stopPropagation()}
                />
            )}
            {drag && (
                <div
                    data-mmd-chrome=""
                    className="mmd-connect-line absolute h-px bg-primary"
                    style={{
                        left: drag.x1,
                        top: drag.y1,
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
            className="absolute z-20 px-1.5 h-7 text-xs bg-background border border-primary rounded-sm shadow-sm outline-none"
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

function firstNodeId(keys: string[]): string | null {
    for (const key of keys) {
        const id = nodeIdFromKey(key);
        if (id) {
            return id;
        }
    }
    return null;
}

function nodeIdFromKey(key: string): string | null {
    return key.startsWith('node:') ? key.slice('node:'.length) : null;
}

function boxRelative(el: Element, host: HTMLElement): Box {
    const a = el.getBoundingClientRect();
    const b = host.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
}

function sameBox(a: Box | null, b: Box): boolean {
    return Boolean(a && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);
}

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    return Boolean(target.closest('input, textarea, select, [contenteditable], .monaco-editor'));
}

function cssEscape(value: string): string {
    return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value.replace(/"/g, '\\"');
}
