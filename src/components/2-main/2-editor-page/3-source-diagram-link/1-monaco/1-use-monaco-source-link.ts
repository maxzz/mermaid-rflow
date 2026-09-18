import { useCallback } from "react";
import { subscribe } from "valtio";
import { monaco } from "@/components/2-main/2-editor-page/1-panel-editor/3-monaco-setup";
import { clearReveal, selectFromEditor, sourceLink } from "@/store/6-source-render-links";
import "./8-highlight.css";

type MonacoEditor = monaco.editor.IStandaloneCodeEditor;

export function useMonacoSourceLink() {
    return useCallback(
        (editor: MonacoEditor) => {
            const decorations = editor.createDecorationsCollection([]);

            const cursorSub = editor.onDidChangeCursorPosition((e) => {
                if (e.source === "api") {
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
                unsub();
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
