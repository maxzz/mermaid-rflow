import { atom, getDefaultStore } from 'jotai';

export type IconSearchQuery = {
    query: string;
    results: { provider: string; prefix: string; name: string; }[];
    loading: boolean;
    loadingMore: boolean;
    error: string;
    isExpanded: boolean;
    hasMore: boolean;
    offset: number;
};

function defaultIconSearchQuery(): IconSearchQuery {
    return ({
        query: '',
        results: [],
        loading: false,
        loadingMore: false,
        error: '',
        isExpanded: false,
        hasMore: true,
        offset: 0,
    });
}

export const rf_IconSearchQueryAtom = atom<IconSearchQuery>(defaultIconSearchQuery());

export function resetIconSearchQuery() {
    const defaultStore = getDefaultStore();
    defaultStore.set(rf_IconSearchQueryAtom, defaultIconSearchQuery());
}

//---------------------------------------------------------------------------
// Search web icons on the fly

export const doSearchIconsAtom = atom(null,
    async (get, set, iconsPerPage: number) => {
        const searchQuery = get(rf_IconSearchQueryAtom);
        if (!searchQuery.query.trim()) {
            return;
        }

        set(rf_IconSearchQueryAtom, { ...searchQuery, loading: true, error: '', results: [], offset: 0, hasMore: true });
        try {
            const icons = await searchIconify(searchQuery.query, iconsPerPage, 0);
            const latest = get(rf_IconSearchQueryAtom);
            if (latest.query !== searchQuery.query) {
                return;
            }
            set(rf_IconSearchQueryAtom, {
                ...latest,
                loading: false,
                results: icons,
                isExpanded: true,
                hasMore: icons.length === iconsPerPage,
                offset: iconsPerPage,
                error: icons.length === 0 ? 'No icons found. Try a different search term.' : '',
            });
        } catch {
            const latest = get(rf_IconSearchQueryAtom);
            if (latest.query !== searchQuery.query) {
                return;
            }
            set(rf_IconSearchQueryAtom, { ...latest, loading: false, error: 'Failed to search icons. Please try again.' });
        }
    }
);

export const doLoadMoreIconSearchAtom = atom(null,
    async (get, set, iconsPerPage: number) => {
        const searchQuery = get(rf_IconSearchQueryAtom);
        if (!searchQuery.query || searchQuery.loadingMore || !searchQuery.hasMore) {
            return;
        }

        set(rf_IconSearchQueryAtom, { ...searchQuery, loadingMore: true });
        try {
            const icons = await searchIconify(searchQuery.query, iconsPerPage, searchQuery.offset);
            const latest = get(rf_IconSearchQueryAtom);
            if (latest.query !== searchQuery.query) {
                return;
            }
            set(rf_IconSearchQueryAtom, {
                ...latest,
                loadingMore: false,
                results: icons.length > 0 ? [...latest.results, ...icons] : latest.results,
                offset: icons.length > 0 ? latest.offset + iconsPerPage : latest.offset,
                hasMore: icons.length === iconsPerPage,
            });
        } catch {
            const latest = get(rf_IconSearchQueryAtom);
            if (latest.query !== searchQuery.query) {
                return;
            }
            set(rf_IconSearchQueryAtom, { ...latest, loadingMore: false });
        }
    }
);

//---------------------------------------------------------------------------
// Search web icons on the fly

export interface IconResult {
    provider: string;
    prefix: string;
    name: string;
    body?: string;
}

export async function searchIconify(query: string, limit = 50, offset = 0, signal?: AbortSignal) {
    if (!query) {
        return [] as IconResult[];
    }

    const url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { signal });
    if (!res.ok) {
        throw new Error('Network error');
    }

    const data = await res.json();
    let results: IconResult[] = [];

    if (Array.isArray(data.icons) && data.icons.every((i: unknown) => typeof i === 'string')) {
        results = data.icons.map(
            (s: string) => {
                const parts = s.split(':');
                const prefix = parts[0] || '';
                const name = parts.slice(1).join(':') || '';
                return { provider: prefix, prefix, name };
            }
        );
    } else {
        results = (data.hits || data.results || []).map(
            (h: Record<string, string>) => ({
                provider: h.provider || h.prefix || '',
                prefix: h.prefix || h.provider || '',
                name: h.name || h.id || h.body || '',
                body: h.body,
            })
        );
    }
    return results;
}
