/**
 * Self-hosted Monaco setup (no CDN).
 *
 * - `editor/editor.api` is the editor core without the built-in TS/JSON/CSS/HTML language services.
 * - The editor worker is bundled by Vite via the `?worker` import.
 * - `monaco-mermaid` registers the `mermaid` language plus `mermaid` / `mermaid-dark` themes.
 */
import * as monaco from 'monaco-editor/editor/editor.api.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import { loader } from '@monaco-editor/react';
import initMermaidLanguage from 'monaco-mermaid';

self.MonacoEnvironment = {
    getWorker() {
        return new EditorWorker();
    },
};

loader.config({ monaco });

initMermaidLanguage(monaco as unknown as Parameters<typeof initMermaidLanguage>[0]);

export const MONACO_LANGUAGE_MERMAID = 'mermaid';
export const MONACO_THEME_LIGHT = 'mermaid';
export const MONACO_THEME_DARK = 'mermaid-dark';

export { monaco };
