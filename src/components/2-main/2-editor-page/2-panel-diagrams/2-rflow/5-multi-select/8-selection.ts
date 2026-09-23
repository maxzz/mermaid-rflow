/** Shift-drag keeps `base` and adds the hit. A plain drag replaces the selection with the hit. */
export function marqueeSelection(
    hitNodeIds: readonly string[],
    hitEdgeIds: readonly string[],
    base: { nodeIds: ReadonlySet<string>; edgeIds: ReadonlySet<string>; } | null,
): { nodeIds: Set<string>; edgeIds: Set<string>; } {
    if (!base) {
        return { nodeIds: new Set(hitNodeIds), edgeIds: new Set(hitEdgeIds) };
    }
    return {
        nodeIds: new Set([...base.nodeIds, ...hitNodeIds]),
        edgeIds: new Set([...base.edgeIds, ...hitEdgeIds]),
    };
}

/** Returns the same array when every `selected` flag already matches. */
export function withSelectedFlag<T extends { id: string; selected?: boolean; }>(items: T[], selectedIds: ReadonlySet<string>): T[] {
    let changed = false;
    
    const next = items.map(
        (item) => {
            const selected = selectedIds.has(item.id);
            if (Boolean(item.selected) === selected) {
                return item;
            }
            changed = true;
            return { ...item, selected };
        }
    );
    
    return changed ? next : items;
}
