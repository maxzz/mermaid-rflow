import { monaco } from "@/components/2-main/2-editor-page/1-panel-editor/3-monaco-setup";

type MonacoEditor = monaco.editor.IStandaloneCodeEditor;
type ViewState = monaco.editor.ICodeEditorViewState | null;

let editorInstance: MonacoEditor | null = null;
let preservedView: ViewState = null;

export function setMonacoEditorInstance(editor: MonacoEditor | null) {
    editorInstance = editor;
    if (!editor) {
        preservedView = null;
    }
}

export function getMonacoCursorLine(): number | null {
    return editorInstance?.getPosition()?.lineNumber ?? null;
}

export function captureMonacoView() {
    preservedView = editorInstance?.saveViewState() ?? null;
}

export function restoreMonacoViewIfNeeded() {
    const editor = editorInstance;
    const view = preservedView;
    if (!editor || !view) {
        return;
    }
    preservedView = null;
    requestAnimationFrame(() => {
        editor.restoreViewState(view);
    });
}
