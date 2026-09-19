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
        results = data.icons.map((s: string) => {
            const parts = s.split(':');
            const prefix = parts[0] || '';
            const name = parts.slice(1).join(':') || '';
            return { provider: prefix, prefix, name };
        });
    } else {
        results = (data.hits || data.results || []).map((h: Record<string, string>) => ({
            provider: h.provider || h.prefix || '',
            prefix: h.prefix || h.provider || '',
            name: h.name || h.id || h.body || '',
            body: h.body,
        }));
    }
    return results;
}
