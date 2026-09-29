import { atom } from 'jotai';

const settledKeysAtom = atom<ReadonlySet<string>>(new Set<string>());

export const sourcePickSettledAtom = atom((get) => get(settledKeysAtom));

/** Records that a marker has finished its entrance, so later pans do not replay it. */
export const settleSourcePickAtom = atom(null, (get, set, key: string) => {
    const current = get(settledKeysAtom);
    if (current.has(key)) {
        return;
    }
    const next = new Set(current);
    next.add(key);
    set(settledKeysAtom, next);
});

let seenKey = '\0';
let seenId = 0;

/**
 * Bumps whenever the editor selection changes, including a clear and a return
 * to the same line, so the entrance animation plays each time the marker appears.
 */
export function sourcePickAppearId(selectionKey: string): number {
    if (selectionKey !== seenKey) {
        seenKey = selectionKey;
        seenId += 1;
    }
    return seenId;
}
