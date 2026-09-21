export type MmdLayout = 'elk' | 'dagre';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/**
 * mermaid.ai writes `layout: fixed` in frontmatter. That name is not a mermaid-js
 * engine — mermaid.ai still lays the diagram out with ELK. mermaid.parse/render
 * also `reset()` to site config and then apply YAML, so initialize({ layout }) is
 * not enough; the render copy must name elk/dagre in frontmatter.
 */
export function sourceWithResolvedLayout(source: string, layout: MmdLayout): string {
    if (!source.trim()) {
        return source;
    }

    const match = source.match(FRONTMATTER);
    if (!match) {
        return `---\nconfig:\n  layout: ${layout}\n---\n${source}`;
    }

    const body = source.slice(match[0].length);
    const front = withLayoutInFrontmatter(match[1], layout);
    return `---\n${front}\n---\n${body}`;
}

function withLayoutInFrontmatter(front: string, layout: MmdLayout): string {
    if (/(^|\n)[ \t]*layout:[ \t]*/i.test(front)) {
        return front.replace(/(^|\n)([ \t]*layout:[ \t]*)[^\n\r]*/i, `$1$2${layout}`);
    }
    if (/(^|\n)[ \t]*config:[ \t]*\r?\n/i.test(front)) {
        return front.replace(/(^|\n)([ \t]*)config:[ \t]*\r?\n/i, `$1$2config:\n$2  layout: ${layout}\n`);
    }
    const prefix = `config:\n  layout: ${layout}`;
    return front.trim() ? `${prefix}\n${front}` : prefix;
}
