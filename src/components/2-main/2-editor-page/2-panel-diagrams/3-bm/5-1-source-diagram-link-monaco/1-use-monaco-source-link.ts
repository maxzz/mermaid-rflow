import { useCallback } from "react";
import { subscribe } from "valtio";
import { monaco } from "@/components/2-main/2-editor-page/1-panel-editor/8-monaco-setup";
import { setEditorFocused } from "@/components/2-main/2-editor-page/2-panel-diagrams/4-source-pick/8-editor-focus";
import { clearReveal, selectFromEditor, sourceLink } from "@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links";
import { setMonacoEditorInstance } from "./2-monaco-editor-handle";
import "./8-highlight-monaco.css";

type MonacoEditor = monaco.editor.IStandaloneCodeEditor;

export function useMonacoSourceLink() {
    return useCallback(
        (editor: MonacoEditor) => {
            setMonacoEditorInstance(editor);
            const decorations = editor.createDecorationsCollection([]);

            // A click on the canvas calls preventDefault, so the textarea can stay the
            // active element. Treat a press outside the editor as blur until it is focused again.
            let focusTimer = 0;
            let pressedOutside = false;
            const editorDom = () => editor.getDomNode();
            const syncFocus = () => {
                if (pressedOutside) {
                    setEditorFocused(false);
                    return;
                }
                const dom = editorDom();
                const active = document.activeElement;
                setEditorFocused(Boolean(dom && active && dom.contains(active)));
            };
            const scheduleFocus = () => {
                window.clearTimeout(focusTimer);
                focusTimer = window.setTimeout(syncFocus, 0);
            };
            const onFocusIn = (event: FocusEvent) => {
                const dom = editorDom();
                if (dom && event.target instanceof Node && dom.contains(event.target)) {
                    pressedOutside = false;
                }
                scheduleFocus();
            };
            const onPointerDown = (event: PointerEvent) => {
                const dom = editorDom();
                const target = event.target;
                if (dom && target instanceof Node && dom.contains(target)) {
                    pressedOutside = false;
                    setEditorFocused(true);
                    return;
                }
                pressedOutside = true;
                setEditorFocused(false);
                const active = document.activeElement;
                if (active instanceof HTMLElement && dom?.contains(active)) {
                    active.blur();
                }
            };
            document.addEventListener('focusin', onFocusIn);
            document.addEventListener('focusout', scheduleFocus);
            document.addEventListener('pointerdown', onPointerDown, true);
            syncFocus();
            window.setTimeout(syncFocus, 0);

            const cursorSub = editor.onDidChangeCursorPosition((e) => {
                if (e.source === "api") {
                    return;
                }
                // Programmatic source patches restore the Monaco view and fire a cursor
                // event that is not "api". Keep a canvas selection until the user
                // actually clicks or types in the editor.
                if (sourceLink.origin === "diagram" && e.source !== "mouse" && e.source !== "keyboard") {
                    return;
                }
                const line = e.position.lineNumber;
                const keys = sourceLink.index?.lineToKeys.get(line) ?? [];
                selectFromEditor(keys, e.source === "mouse" ? "click" : "caret", line);
            });

            const apply = () => {
                applyReveal(editor);
                applyDecorations(editor, decorations);
            };

            apply();
            bindCaretIfIdle(editor);
            const unsub = subscribe(sourceLink, () => {
                apply();
                bindCaretIfIdle(editor);
            });

            editor.onDidDispose(() => {
                cursorSub.dispose();
                window.clearTimeout(focusTimer);
                document.removeEventListener('focusin', onFocusIn);
                document.removeEventListener('focusout', scheduleFocus);
                document.removeEventListener('pointerdown', onPointerDown, true);
                setEditorFocused(false);
                unsub();
                setMonacoEditorInstance(null);
            });
        },
        []);
}

function applyReveal(editor: MonacoEditor) {
    const reveal = sourceLink.reveal;
    if (!reveal || sourceLink.origin !== "diagram") {
        return;
    }
    const range = new monaco.Range(reveal.line, reveal.startCol, reveal.line, reveal.endCol);
    editor.setSelection(range);
    editor.revealLineInCenter(reveal.line);
    clearReveal();
}

function bindCaretIfIdle(editor: MonacoEditor) {
    if (!sourceLink.index || sourceLink.origin !== null || sourceLink.focusLine !== null) {
        return;
    }
    const line = editor.getPosition()?.lineNumber;
    if (!line) {
        return;
    }
    queueMicrotask(() => {
        if (sourceLink.origin === null && sourceLink.focusLine === null) {
            const keys = sourceLink.index?.lineToKeys.get(line) ?? [];
            selectFromEditor(keys, "caret", line);
        }
    });
}

function applyDecorations(editor: MonacoEditor, decorations: monaco.editor.IEditorDecorationsCollection) {
    const line = sourceLink.focusLine;
    if (!line) {
        decorations.clear();
        return;
    }
    const className = sourceLink.intensity === "click" ? "source-link-line-click" : "source-link-line-caret";
    decorations.set([
        {
            range: new monaco.Range(line, 1, line, 1),
            options: {
                isWholeLine: true,
                className,
            },
        },
    ]);
}
