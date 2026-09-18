/**
 * Lazy module loaders. Both `beautiful-mermaid` (bundles the ELK layout engine)
 * and Monaco are large, so they live in their own chunks (see vite.config.ts)
 * and are loaded on demand. Promises are cached so `use()` gets a stable reference.
 */

//---------------------------------------------------------------------------
// Beautiful Mermaid

export type BeautifulMermaidModule = typeof import('beautiful-mermaid');

let beautifulMermaidPromise: Promise<BeautifulMermaidModule> | undefined;

export function loadBeautifulMermaid(): Promise<BeautifulMermaidModule> {
    beautifulMermaidPromise ??= import('beautiful-mermaid');
    return beautifulMermaidPromise;
}

//---------------------------------------------------------------------------
// Monaco Editor

export function loadMonacoEditor() {
    return import('@/components/2-main/2-editor-page/1-panel-editor/2-monaco-editor');
}

/** Warm up heavy chunks while the user is still on the welcome page. */
export function preloadEditorPageModules() {
    loadBeautifulMermaid().catch(() => { /* surfaced later by Suspense error boundary */ });
    loadMonacoEditor().catch(() => { /* surfaced later by Suspense error boundary */ });
}
