import {
    SOURCE_LINK_HIT_ATTR,
    SOURCE_LINK_KEY_ATTR,
    type CatalogEntry,
} from '@/store/6-source-render-links';

export const MMD_TAGGED_SELECTOR = [
    'g.node',
    'g.cluster',
    'path.flowchart-link',
    'g.edgePath',
    'g.actor',
    'g.classGroup',
    'g[id^="entity-"]',
    'g.er.entityBox',
].join(',');

/** mermaid.render(id) prefixes every SVG id with `${id}-`. */
const MMD_RENDER_PREFIX = /^mermaid-mmd-\d+-/;

export function stripMmdRenderPrefix(domId: string): string {
    return domId.replace(MMD_RENDER_PREFIX, '');
}

export function mermaidIdFromDomId(domId: string): string | null {
    const id = stripMmdRenderPrefix(domId);
    const flowchart = id.match(/^flowchart-(.+)-(\d+)$/);
    if (flowchart?.[1]) {
        return decodeMermaidId(flowchart[1]);
    }
    const cluster = id.match(/^cluster(?:-|_)(.+)$/);
    if (cluster?.[1]) {
        return decodeMermaidId(cluster[1].replace(/-\d+$/, ''));
    }
    if (id && !/^(mermaid-|id-|L[_-]|edge)/i.test(id)) {
        return decodeMermaidId(id);
    }
    return null;
}

export function edgeEndpointsFromDomId(domId: string, knownIds: string[] = []): { from: string; to: string; } | null {
    const id = stripMmdRenderPrefix(domId);
    const underscored = id.match(/^(?:L|id)_(.+)_([^_]+)_(\d+)$/);
    if (underscored?.[1] && underscored[2]) {
        const guessed = { from: decodeMermaidId(underscored[1]), to: decodeMermaidId(underscored[2]) };
        if (!knownIds.length || (knownIds.includes(guessed.from) && knownIds.includes(guessed.to))) {
            return guessed;
        }
    }
    const hyphen = id.match(/^L-(.+)-(.+)-(\d+)$/);
    if (hyphen?.[1] && hyphen[2] && !knownIds.length) {
        return { from: decodeMermaidId(hyphen[1]), to: decodeMermaidId(hyphen[2]) };
    }
    if (knownIds.length) {
        return matchKnownPair(id, knownIds);
    }
    return null;
}

export function catalogMmdSvg(root: Element): CatalogEntry[] {
    const entries: CatalogEntry[] = [];
    const seen = new Set<string>();
    const knownIds: string[] = [];

    for (const el of root.querySelectorAll('g.node, g.cluster, g.classGroup, g.actor')) {
        const entry = entryFromGroup(el);
        if (!entry) {
            continue;
        }
        el.setAttribute(SOURCE_LINK_KEY_ATTR, entry.key);
        if (!seen.has(entry.key)) {
            seen.add(entry.key);
            entries.push(entry);
            if (entry.ids[0]) {
                knownIds.push(entry.ids[0]);
            }
        }
    }

    for (const el of root.querySelectorAll('path.flowchart-link, g.edgePath, g.edgePath > path')) {
        if (el.hasAttribute(SOURCE_LINK_HIT_ATTR)) {
            continue;
        }
        const tagged = el.closest('g.edgePath') ?? el;
        if (tagged.hasAttribute(SOURCE_LINK_KEY_ATTR)) {
            continue;
        }
        const entry = entryFromEdge(tagged, knownIds);
        if (!entry) {
            continue;
        }
        tagged.setAttribute(SOURCE_LINK_KEY_ATTR, entry.key);
        if (el !== tagged) {
            el.setAttribute(SOURCE_LINK_KEY_ATTR, entry.key);
        }
        if (!seen.has(entry.key)) {
            seen.add(entry.key);
            entries.push(entry);
        }
    }

    addMmdHitStrokes(root);
    return entries;
}

export function closestMmdTagged(target: EventTarget | null): Element | null {
    if (!(target instanceof Element)) {
        return null;
    }
    return target.closest(`[${SOURCE_LINK_KEY_ATTR}]`);
}

export function addMmdHitStrokes(root: Element): void {
    for (const el of root.querySelectorAll('path.flowchart-link, g.edgePath > path')) {
        if (el.hasAttribute(SOURCE_LINK_HIT_ATTR)) {
            continue;
        }
        const clone = el.cloneNode(true) as Element;
        clone.setAttribute(SOURCE_LINK_HIT_ATTR, '');
        clone.setAttribute('stroke', 'transparent');
        clone.setAttribute('stroke-width', '12');
        clone.setAttribute('fill', 'none');
        clone.removeAttribute('marker-end');
        clone.removeAttribute('marker-start');
        el.after(clone);
    }
}

function entryFromGroup(el: Element): CatalogEntry | null {
    if (el.classList.contains('cluster')) {
        const id = mermaidIdFromDomId(el.id) ?? textLabel(el);
        if (!id) {
            return null;
        }
        return { key: `subgraph:${id}`, kind: 'subgraph', ids: [id], label: textLabel(el) };
    }
    if (el.classList.contains('actor') || el.classList.contains('actor-man')) {
        const id = textLabel(el);
        if (!id) {
            return null;
        }
        return { key: `actor:${id}`, kind: 'actor', ids: [id], label: id };
    }
    if (el.classList.contains('classGroup')) {
        const id = mermaidIdFromDomId(el.id) ?? textLabel(el);
        if (!id) {
            return null;
        }
        return { key: `class-node:${id}`, kind: 'class-node', ids: [id], label: textLabel(el) };
    }
    const id = mermaidIdFromDomId(el.id) ?? el.querySelector('.label')?.id ?? textLabel(el);
    if (!id) {
        return null;
    }
    return { key: `node:${id}`, kind: 'node', ids: [id], label: textLabel(el) };
}

export function catalogEdgeKey(from: string, to: string, label?: string): string {
    return label ? `edge:${from}>${to}:${label}` : `edge:${from}>${to}`;
}

export function parseCatalogEdgeKey(key: string): { from: string; to: string; label?: string; } | null {
    if (!key.startsWith('edge:')) {
        return null;
    }
    const rest = key.slice('edge:'.length);
    const colon = rest.indexOf(':');
    const pair = colon === -1 ? rest : rest.slice(0, colon);
    const label = colon === -1 ? undefined : rest.slice(colon + 1) || undefined;
    const gt = pair.indexOf('>');
    if (gt < 1) {
        return null;
    }
    const from = pair.slice(0, gt);
    const to = pair.slice(gt + 1);
    if (!from || !to) {
        return null;
    }
    return { from, to, label };
}

function entryFromEdge(el: Element, knownIds: string[]): CatalogEntry | null {
    const pair = edgeEndpointsFromDomId(el.id || el.querySelector('[id]')?.id || '', knownIds);
    if (!pair) {
        return null;
    }
    const label = textLabel(el.closest('g.edgePath') ?? el);
    return {
        key: catalogEdgeKey(pair.from, pair.to, label),
        kind: 'edge',
        ids: [pair.from, pair.to],
        label: label || undefined,
    };
}

function matchKnownPair(domId: string, knownIds: string[]): { from: string; to: string; } | null {
    const sorted = [...knownIds].sort((a, b) => b.length - a.length);
    for (const from of sorted) {
        for (const to of sorted) {
            if (from === to) {
                continue;
            }
            if (domId.includes(from) && domId.includes(to) && domId.indexOf(from) < domId.indexOf(to)) {
                return { from, to };
            }
        }
    }
    return null;
}

function decodeMermaidId(raw: string): string {
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

function textLabel(el: Element): string | undefined {
    const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ');
    return text || undefined;
}
