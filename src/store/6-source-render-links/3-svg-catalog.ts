import type { CatalogEntry, SvgElementKind } from './1-types';

export const SOURCE_LINK_KEY_ATTR = 'data-source-link-key';
export const SOURCE_LINK_HIT_ATTR = 'data-source-link-hit';

export const TAGGED_SELECTOR = [
    'g.node',
    'g.subgraph',
    'polyline.edge',
    'g.edge-label',
    'g.actor',
    'line.lifeline',
    'rect.activation',
    'g.message',
    'g.block',
    'g.note',
    'g.class-node',
    'polyline.class-relationship',
    'g.entity',
    'polyline.er-relationship',
].join(',');

const HIT_STROKE_SELECTOR = [
    'polyline.edge',
    'polyline.class-relationship',
    'polyline.er-relationship',
    'line.lifeline',
    'g.message > line',
    'g.message > polyline',
].join(',');

const KIND_BY_CLASS: Record<string, SvgElementKind> = {
    node: 'node',
    subgraph: 'subgraph',
    edge: 'edge',
    'edge-label': 'edge-label',
    actor: 'actor',
    lifeline: 'lifeline',
    activation: 'activation',
    message: 'message',
    block: 'block',
    note: 'note',
    'class-node': 'class-node',
    'class-relationship': 'class-relationship',
    entity: 'entity',
    'er-relationship': 'er-relationship',
};

export function closestTagged(target: EventTarget | null): Element | null {
    if (!(target instanceof Element)) {
        return null;
    }
    return target.closest(TAGGED_SELECTOR);
}

export function catalogSvg(root: Element): CatalogEntry[] {
    const entries: CatalogEntry[] = [];
    const seen = new Set<string>();

    for (const el of root.querySelectorAll(TAGGED_SELECTOR)) {
        if (el.hasAttribute(SOURCE_LINK_HIT_ATTR)) {
            continue;
        }
        const entry = entryFromElement(el);
        if (!entry) {
            continue;
        }
        el.setAttribute(SOURCE_LINK_KEY_ATTR, entry.key);
        if (seen.has(entry.key)) {
            continue;
        }
        seen.add(entry.key);
        entries.push(entry);
    }

    return entries;
}

/** Wider transparent sibling so thin connectors are clickable. */
export function addHitStrokes(root: Element): void {
    for (const el of root.querySelectorAll(HIT_STROKE_SELECTOR)) {
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

export function entryFromElement(el: Element): CatalogEntry | null {
    const kind = kindOf(el);
    if (!kind) {
        return null;
    }
    return entryFromKind(kind, el);
}

function kindOf(el: Element): SvgElementKind | null {
    for (const cls of el.classList) {
        const kind = KIND_BY_CLASS[cls];
        if (kind) {
            return kind;
        }
    }
    return null;
}

function entryFromKind(kind: SvgElementKind, el: Element): CatalogEntry | null {
    switch (kind) {
        case 'node':
        case 'subgraph':
        case 'actor':
        case 'class-node':
        case 'entity': {
            const id = attr(el, 'data-id');
            if (!id) {
                return null;
            }
            return { key: `${kind}:${id}`, kind, ids: [id], label: attr(el, 'data-label') };
        }
        case 'lifeline':
        case 'activation': {
            const actor = attr(el, 'data-actor');
            if (!actor) {
                return null;
            }
            return { key: `${kind}:${actor}`, kind, ids: [actor] };
        }
        case 'edge':
        case 'edge-label':
        case 'message':
        case 'class-relationship': {
            const from = attr(el, 'data-from');
            const to = attr(el, 'data-to');
            if (!from || !to) {
                return null;
            }
            const label = attr(el, 'data-label');
            const keyKind = kind === 'edge-label' ? 'edge' : kind;
            return {
                key: connectorKey(keyKind, from, to, label),
                kind,
                ids: [from, to],
                label,
            };
        }
        case 'er-relationship': {
            const a = attr(el, 'data-entity1');
            const b = attr(el, 'data-entity2');
            if (!a || !b) {
                return null;
            }
            const label = attr(el, 'data-label');
            return {
                key: connectorKey(kind, a, b, label),
                kind,
                ids: [a, b],
                label,
            };
        }
        case 'note': {
            const actors = (attr(el, 'data-actors') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
            const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
            return {
                key: `note:${actors.join(',')}:${text}`,
                kind,
                ids: actors,
                label: text || undefined,
            };
        }
        case 'block': {
            const type = attr(el, 'data-type');
            if (!type) {
                return null;
            }
            const label = attr(el, 'data-label');
            return {
                key: label ? `block:${type}:${label}` : `block:${type}`,
                kind,
                ids: [type],
                label,
            };
        }
    }
}

function connectorKey(kind: string, from: string, to: string, label?: string): string {
    return label ? `${kind}:${from}>${to}:${label}` : `${kind}:${from}>${to}`;
}

function attr(el: Element, name: string): string | undefined {
    return el.getAttribute(name) || undefined;
}
