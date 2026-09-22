/**
 * Adapted from mermaid-reactflow-editor (MIT).
 */
import { useAtom } from 'jotai';
import { Loader2Icon, SearchIcon, XIcon } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { searchIconify } from './2-2-2-util-iconify';
import { resetIconSearchQuery, rf_IconSearchQueryAtom } from '../8-store/a-rflow-ui-atoms';

const ICONS_PER_PAGE = 48;

export function IconSearch({ onSelect }: { onSelect: (iconUrl: string) => void; }) {
    const [searchQuery, setSearchQuery] = useAtom(rf_IconSearchQueryAtom);

    async function handleSearch() {
        if (!searchQuery.query.trim()) {
            return;
        }
        setSearchQuery({ ...searchQuery, loading: true, error: '', results: [], offset: 0, hasMore: true });
        try {
            const icons = await searchIconify(searchQuery.query, ICONS_PER_PAGE, 0);
            setSearchQuery({
                ...searchQuery,
                loading: false,
                results: icons,
                isExpanded: true,
                hasMore: icons.length === ICONS_PER_PAGE,
                offset: ICONS_PER_PAGE,
                error: icons.length === 0 ? 'No icons found. Try a different search term.' : '',
            });
        } catch {
            setSearchQuery({ ...searchQuery, loading: false, error: 'Failed to search icons. Please try again.' });
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-1.5">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search icons..."
                        value={searchQuery.query}
                        onChange={(e) => setSearchQuery({ ...searchQuery, query: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }}
                        className="pl-7"
                    />
                </div>

                <Button type="button" size="xs" onClick={() => void handleSearch()} disabled={searchQuery.loading || !searchQuery.query.trim()}>
                    {searchQuery.loading ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
                </Button>

                {(searchQuery.isExpanded || searchQuery.results.length > 0) && (
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => resetIconSearchQuery()}>
                        <XIcon />
                    </Button>
                )}
            </div>

            {searchQuery.error && (
                <div className="p-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded">
                    {searchQuery.error}
                </div>
            )}

            <IconSearchResults onSelect={onSelect} />
        </div>
    );
}

function IconSearchResults({ onSelect }: { onSelect: (iconUrl: string) => void; }) {
    const [searchQuery, setSearchQuery] = useAtom(rf_IconSearchQueryAtom);

    if (searchQuery.results.length === 0) {
        return null;
    }

    async function loadMore() {
        if (!searchQuery.query || searchQuery.loadingMore || !searchQuery.hasMore) {
            return;
        }
        setSearchQuery({ ...searchQuery, loadingMore: true });
        try {
            const icons = await searchIconify(searchQuery.query, ICONS_PER_PAGE, searchQuery.offset);
            setSearchQuery({
                ...searchQuery,
                loadingMore: false,
                results: icons.length > 0 ? [...searchQuery.results, ...icons] : searchQuery.results,
                offset: icons.length > 0 ? searchQuery.offset + ICONS_PER_PAGE : searchQuery.offset,
                hasMore: icons.length === ICONS_PER_PAGE,
            });
        } catch {
            setSearchQuery({ ...searchQuery, loadingMore: false });
        }
    }

    function handleSelectIcon(prefix: string, name: string) {
        onSelect(`https://api.iconify.design/${prefix}/${name}.svg`);
        resetIconSearchQuery();
    }

    return (
        <div className="p-2 max-h-48 bg-muted/30 border rounded-md overflow-y-auto">
            <div className="grid grid-cols-6 gap-1.5">
                {searchQuery.results.map(
                    (icon, idx) => {
                        const iconId = `${icon.prefix}:${icon.name}`;
                        const iconUrl = `https://api.iconify.design/${icon.prefix}/${icon.name}.svg`;
                        const isLast = idx === searchQuery.results.length - 1;
                        return (
                            <button
                                key={`${iconId}-${idx}`}
                                type="button"
                                onClick={() => handleSelectIcon(icon.prefix, icon.name)}
                                onMouseEnter={() => { if (isLast) void loadMore(); }}
                                className="p-1 aspect-square hover:border-primary border rounded flex items-center justify-center"
                                title={iconId}
                            >
                                <img src={iconUrl} alt={icon.name} className="size-5 object-contain" loading="lazy" />
                            </button>
                        );
                    }
                )}
            </div>

            {searchQuery.loadingMore && (
                <div className="pt-2 text-[.65rem] text-muted-foreground text-center">Loading more...</div>
            )}
        </div>
    );
}
