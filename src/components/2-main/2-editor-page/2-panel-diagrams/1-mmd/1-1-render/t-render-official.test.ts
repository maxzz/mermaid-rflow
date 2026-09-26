import { describe, expect, it } from 'vitest';
import { sourceWithResolvedLayout } from './3-render-layout';

describe('sourceWithResolvedLayout', () => {
    it('rewrites mermaid.ai layout: fixed to the chosen engine', () => {
        const src = `---\nconfig:\n  layout: fixed\n---\nflowchart TB\n    A --> B\n`;
        expect(sourceWithResolvedLayout(src, 'elk')).toContain('layout: elk');
        expect(sourceWithResolvedLayout(src, 'elk')).not.toMatch(/layout:\s*fixed/);
        expect(sourceWithResolvedLayout(src, 'elk')).toContain('flowchart TB');
    });

    it('overrides dagre/elk frontmatter with the chosen engine', () => {
        const src = `---\nconfig:\n  layout: dagre\n---\nflowchart TB\n    A --> B\n`;
        expect(sourceWithResolvedLayout(src, 'elk')).toContain('layout: elk');
        expect(sourceWithResolvedLayout(src, 'elk')).not.toMatch(/layout:\s*dagre/);
    });

    it('injects layout into existing config when the key is missing', () => {
        const src = `---\nconfig:\n  theme: redux-color\n---\nflowchart TB\n    A --> B\n`;
        const out = sourceWithResolvedLayout(src, 'elk');
        expect(out).toContain('layout: elk');
        expect(out).toContain('theme: redux-color');
        expect(out).toContain('flowchart TB');
    });

    it('prepends layout frontmatter when the source has none', () => {
        const src = 'flowchart TB\n    A --> B\n';
        const out = sourceWithResolvedLayout(src, 'elk');
        expect(out.startsWith('---\nconfig:\n  layout: elk\n---\n')).toBe(true);
        expect(out).toContain('flowchart TB');
    });
});
