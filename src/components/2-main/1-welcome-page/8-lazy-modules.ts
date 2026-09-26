/**
 * Lazy module loaders. `beautiful-mermaid` (bundles the ELK layout engine) is
 * large, so it lives in its own chunk (see vite.config.ts) and is loaded on
 * demand. The promise is cached so `use()` gets a stable reference.
 */

//---------------------------------------------------------------------------
// Beautiful Mermaid

export type BeautifulMermaidModule = typeof import('beautiful-mermaid');

let beautifulMermaidPromise: Promise<BeautifulMermaidModule> | undefined;

export function loadBeautifulMermaid(): Promise<BeautifulMermaidModule> {
    beautifulMermaidPromise ??= import('beautiful-mermaid');
    return beautifulMermaidPromise;
}

/** Warm up the SVG/text renderer while the user is still on the welcome page. */
export function preloadEditorPageModules() {
    loadBeautifulMermaid().catch(() => { /* surfaced later by Suspense error boundary */ });
}
