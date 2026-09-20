/**
 * Adapted from mermaid-reactflow-editor (MIT).
 */
import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { useSnapshot } from 'valtio';
import { FolderOpenIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { Button } from '@/ui/shadcn/button';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { renderDiagram } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/5-render-diagram/5-render';
import { loadBeautifulMermaid } from '@/components/2-main/2-editor-page/1-panel-editor/8-lazy-modules';
import { restoreFlow } from '../store/1-flow-diagram';
import { defaultLoadDialogUi, rflowLoadDialogOpenAtom, rflowLoadPreviewAtom, rflowLoadUiAtom } from '../store/2-flow-ui';
import { parseSavedDiagram, removeSavedDiagram, rflowSaved, type SavedDiagram } from '../storage/saved-diagrams';
import { classNames } from '@/utils';

export function LoadDialog() {
    const [open, setOpen] = useAtom(rflowLoadDialogOpenAtom);
    const [ui, setUi] = useAtom(rflowLoadUiAtom);
    const { diagrams } = useSnapshot(rflowSaved);
    const saved = diagrams as SavedDiagram[];

    useEffect(
        () => {
            if (!open) {
                setUi(defaultLoadDialogUi());
            }
        },
        [open, setUi],
    );

    const list: SavedDiagram[] = ui.imported ? [ui.imported, ...saved] : [...saved];
    const selected = list.find((d) => d.id === ui.selectedId) ?? null;

    function onLoad() {
        if (!selected) {
            return;
        }
        restoreFlow(selected.mermaid, { nodes: selected.nodes, edges: selected.edges });
        mermaidSettings.source = selected.mermaid;
        toast.success('Diagram loaded');
        setOpen(false);
    }

    function onFile(file: File) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = parseSavedDiagram(JSON.parse(String(reader.result)));
                if (!parsed) {
                    throw new Error('Invalid diagram file format');
                }
                const imported = { ...parsed, id: 'imported' };
                setUi({ ...ui, imported, selectedId: 'imported' });
            } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Invalid file format');
            }
        };
        reader.readAsText(file);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="p-0 max-w-3xl gap-0">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-sm">Saved diagrams</DialogTitle>
                </DialogHeader>

                <div className="px-4 py-2 border-b flex items-center justify-end gap-1.5">
                    <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'application/json,.json';
                            input.onchange = () => {
                                const file = input.files?.[0];
                                if (file) {
                                    onFile(file);
                                }
                            };
                            input.click();
                        }}
                    >
                        <FolderOpenIcon />
                        Upload JSON
                    </Button>
                    <Button variant="outline" size="xs" onClick={() => setOpen(false)}>Close</Button>
                    <Button size="xs" onClick={onLoad} disabled={!selected}>Load</Button>
                </div>

                <div className="grid grid-cols-[minmax(0,14rem)_1fr] min-h-72 max-h-112">
                    <div className="border-r overflow-y-auto">
                        {list.length === 0
                            ? (
                                <div className="p-4 text-xs text-muted-foreground">No saved diagrams</div>
                            )
                            : list.map((diagram) => (
                                <div
                                    key={diagram.id}
                                    className={classNames(
                                        'px-3 py-2 text-xs border-b cursor-pointer flex items-start justify-between gap-2',
                                        ui.selectedId === diagram.id ? 'bg-muted' : 'hover:bg-muted/50',
                                    )}
                                    onClick={() => setUi({ ...ui, selectedId: diagram.id })}
                                >
                                    <div className="min-w-0">
                                        <div className="font-medium truncate">{diagram.name}</div>
                                        <div className="text-muted-foreground">{new Date(diagram.createdAt).toLocaleDateString()}</div>
                                    </div>
                                    {diagram.id !== 'imported' && (
                                        ui.confirmDeleteId === diagram.id
                                            ? (
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="destructive"
                                                        size="xs"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeSavedDiagram(diagram.id);
                                                            setUi({
                                                                ...ui,
                                                                confirmDeleteId: null,
                                                                selectedId: ui.selectedId === diagram.id ? null : ui.selectedId,
                                                            });
                                                        }}
                                                    >
                                                        Delete
                                                    </Button>
                                                    <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); setUi({ ...ui, confirmDeleteId: null }); }}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            )
                                            : (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={(e) => { e.stopPropagation(); setUi({ ...ui, confirmDeleteId: diagram.id }); }}
                                                    title="Delete"
                                                >
                                                    <Trash2Icon />
                                                </Button>
                                            )
                                    )}
                                </div>
                            ))}
                    </div>

                    <div className="p-3 min-w-0 overflow-auto">
                        {selected
                            ? (
                                <div className="h-full flex flex-col gap-2">
                                    <div>
                                        <div className="text-sm font-medium">{selected.name}</div>
                                        <div className="text-[.7rem] text-muted-foreground">Created: {new Date(selected.createdAt).toLocaleString()}</div>
                                    </div>
                                    <SavedSvgPreview source={selected.mermaid} />
                                </div>
                            )
                            : (
                                <div className="h-full text-xs text-muted-foreground flex items-center justify-center">
                                    Select a diagram to preview
                                </div>
                            )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function SavedSvgPreview({ source }: { source: string; }) {
    const { diagramTheme, ascii, svg } = useSnapshot(mermaidSettings);
    const [markup, setMarkup] = useAtom(rflowLoadPreviewAtom);

    useEffect(
        () => {
            let cancelled = false;
            setMarkup('');
            void (async () => {
                try {
                    const bm = await loadBeautifulMermaid();
                    const result = renderDiagram(bm, source, { diagramTheme, ascii, svg }, 'svg');
                    if (!cancelled) {
                        setMarkup(result.error ? `<pre>${escapeHtml(result.error)}</pre>` : result.output);
                    }
                } catch (err) {
                    if (!cancelled) {
                        setMarkup(`<pre>${escapeHtml(err instanceof Error ? err.message : String(err))}</pre>`);
                    }
                }
            })();
            return () => { cancelled = true; };
        },
        [ascii, diagramTheme, setMarkup, source, svg],
    );

    return (
        <div
            className="flex-1 min-h-0 p-2 bg-muted/20 border rounded overflow-auto [&>svg]:max-w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: markup }}
        />
    );
}

function escapeHtml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
