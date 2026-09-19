/**
 * Adapted from mermaid-reactflow-editor (MIT).
 */
import { useAtom } from 'jotai';
import { Loader2Icon, SearchIcon, XIcon } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { searchIconify } from '../lib/iconify';
import { defaultIconSearchState, rflowIconSearchAtom } from '../store/2-flow-ui';

const ICONS_PER_PAGE = 48;

export function IconSearch({ onSelect }: { onSelect: (iconUrl: string) => void; }) {
    const [state, setState] = useAtom(rflowIconSearchAtom);

    async function handleSearch() {
        if (!state.query.trim()) {
            return;
        }
        setState({ ...state, loading: true, error: '', results: [], offset: 0, hasMore: true });
        try {
            const icons = await searchIconify(state.query, ICONS_PER_PAGE, 0);
            setState({
                ...state,
                loading: false,
                results: icons,
                isExpanded: true,
                hasMore: icons.length === ICONS_PER_PAGE,
                offset: ICONS_PER_PAGE,
                error: icons.length === 0 ? 'No icons found. Try a different search term.' : '',
            });
        } catch {
            setState({ ...state, loading: false, error: 'Failed to search icons. Please try again.' });
        }
    }

    async function loadMore() {
        if (!state.query || state.loadingMore || !state.hasMore) {
            return;
        }
        setState({ ...state, loadingMore: true });
        try {
            const icons = await searchIconify(state.query, ICONS_PER_PAGE, state.offset);
            setState({
                ...state,
                loadingMore: false,
                results: icons.length > 0 ? [...state.results, ...icons] : state.results,
                offset: icons.length > 0 ? state.offset + ICONS_PER_PAGE : state.offset,
                hasMore: icons.length === ICONS_PER_PAGE,
            });
        } catch {
            setState({ ...state, loadingMore: false });
        }
    }

    function handleSelectIcon(prefix: string, name: string) {
        onSelect(`https://api.iconify.design/${prefix}/${name}.svg`);
        setState(defaultIconSearchState());
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-1.5">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search icons..."
                        value={state.query}
                        onChange={(e) => setState({ ...state, query: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }}
                        className="pl-7"
                    />
                </div>
                <Button type="button" size="xs" onClick={() => void handleSearch()} disabled={state.loading || !state.query.trim()}>
                    {state.loading ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
                </Button>
                {(state.isExpanded || state.results.length > 0) && (
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => setState(defaultIconSearchState())}>
                        <XIcon />
                    </Button>
                )}
            </div>

            {state.error && (
                <div className="p-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded">
                    {state.error}
                </div>
            )}

            {state.results.length > 0 && (
                <div className="p-2 max-h-48 bg-muted/30 border rounded-md overflow-y-auto">
                    <div className="grid grid-cols-6 gap-1.5">
                        {state.results.map((icon, idx) => {
                            const iconId = `${icon.prefix}:${icon.name}`;
                            const iconUrl = `https://api.iconify.design/${icon.prefix}/${icon.name}.svg`;
                            const isLast = idx === state.results.length - 1;
                            return (
                                <button
                                    key={`${iconId}-${idx}`}
                                    type="button"
                                    onClick={() => handleSelectIcon(icon.prefix, icon.name)}
                                    onMouseEnter={() => { if (isLast) void loadMore(); }}
                                    className="aspect-square p-1 border rounded hover:border-primary flex items-center justify-center"
                                    title={iconId}
                                >
                                    <img src={iconUrl} alt={icon.name} className="size-5 object-contain" loading="lazy" />
                                </button>
                            );
                        })}
                    </div>
                    {state.loadingMore && (
                        <div className="pt-2 text-[.65rem] text-muted-foreground text-center">Loading more...</div>
                    )}
                </div>
            )}
        </div>
    );
}
