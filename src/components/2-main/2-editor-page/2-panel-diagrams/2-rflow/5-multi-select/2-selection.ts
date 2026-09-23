/** Returns the same array when every `selected` flag already matches. */
export function withSelectedFlag<T extends { id: string; selected?: boolean; }>(items: T[], selectedIds: ReadonlySet<string>): T[] {
    let changed = false;
    const next = items.map((item) => {
        const selected = selectedIds.has(item.id);
        if (Boolean(item.selected) === selected) {
            return item;
        }
        changed = true;
        return { ...item, selected };
    });
    return changed ? next : items;
}
