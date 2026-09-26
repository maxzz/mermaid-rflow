import { useEffect } from "react";
import { useSnapshot } from "valtio";
import Editor, { type EditorProps } from "@monaco-editor/react";
import { appSettings } from "@/store/1-ui-settings";
import { mermaidSettings } from "@/store/2-mermaid-settings";
import { isThemeDark } from "@/utils/theme-utils";
import { BarsLoaderIcon } from "@/ui/local-ui";
import { ErrorBoundary } from "@/ui/local-ui/8-error-boundary";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { useMonacoSourceLink } from "@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/5-1-source-diagram-link-monaco";
import { restoreMonacoViewIfNeeded } from "@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/5-1-source-diagram-link-monaco/2-monaco-editor-handle";
import { EditorToolbar } from "./2-1-editor-toolbar";
import { MONACO_LANGUAGE_MERMAID, MONACO_THEME_DARK, MONACO_THEME_LIGHT } from "./8-monaco-setup";

export function EditorPanel() {
    return (
        <div className="h-full flex flex-col">
            <EditorToolbar />

            <div className="flex-1 relative min-h-0">
                <div className="absolute inset-0 overflow-hidden">
                    <ScrollArea className="h-full" fullHeight fixedWidth viewportClassName="overflow-hidden!">
                        <ErrorBoundary fallback={<PanelMessage>Failed to load the editor.</PanelMessage>}>
                            <MonacoMermaidEditor />
                        </ErrorBoundary>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}

function PanelMessage({ children }: { children: React.ReactNode; }) {
    return (
        <div className="h-full text-xs text-muted-foreground flex items-center justify-center">
            {children}
        </div>
    );
}

/**
 * Monaco editor bound to Valtio mermaidSettings.source.
 * Importing this file pulls Monaco + monaco-mermaid (see 8-monaco-setup.ts).
 */
function MonacoMermaidEditor() {
    const { source } = useSnapshot(mermaidSettings);
    const { theme } = useSnapshot(appSettings);
    const isDark = isThemeDark(theme);
    const onMount = useMonacoSourceLink();

    useEffect(
        () => {
            restoreMonacoViewIfNeeded();
        },
        [source]);

    return (
        <Editor
            className="h-full"
            language={MONACO_LANGUAGE_MERMAID}
            theme={isDark ? MONACO_THEME_DARK : MONACO_THEME_LIGHT}
            value={source}
            onChange={(value) => { mermaidSettings.source = value ?? ''; }}
            onMount={onMount}
            options={editorOptions}
            loading={<BarsLoaderIcon />}
        />
    );
}

const editorOptions: EditorProps['options'] = {
    fontSize: 11,
    fontFamily: "'Geist Mono Variable', monospace",
    fontLigatures: true,
    lineNumbersMinChars: 3,
    minimap: { enabled: false },
    wordWrap: 'on',
    tabSize: 4,
    insertSpaces: true,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    renderLineHighlight: 'line',
    padding: { top: 8, bottom: 8 },
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    bracketPairColorization: { enabled: true },
    overviewRulerLanes: 0,
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8, vertical: 'auto', horizontal: 'auto' },
};
