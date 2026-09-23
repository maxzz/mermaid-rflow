import { useAtom, useSetAtom } from 'jotai';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shadcn/dialog';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { Label } from '@/ui/shadcn/label';
import { Textarea } from '@/ui/shadcn/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/shadcn/tabs';

import { rf_NodeEditorDraftAtom, doRflowSaveNodeEditorAtom } from '../8-store/a-rflow-ui-atoms';
import { resetIconSearchQuery } from '../8-store/a-rflow-icon-search-atoms';
import { IconSearch } from './2-2-1-dlg-search';
import { COLOR_PRESETS } from '../2-converter/constants';

export function NodeEditor() {
    const [draft, setDraft] = useAtom(rf_NodeEditorDraftAtom);
    const doRflowSaveNodeEditor = useSetAtom(doRflowSaveNodeEditorAtom);

    if (!draft) {
        return null;
    }

    function close() {
        setDraft(null);
        resetIconSearchQuery();
    }

    return (
        <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
            <DialogContent className="p-0 max-w-md min-h-86 gap-0">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-sm">
                        Edit {draft.nodeType === 'group' ? 'subgraph' : 'node'}
                    </DialogTitle>
                </DialogHeader>

                <div className="px-4 py-3">
                    <Tabs defaultValue="content">
                        <TabsList className="h-7">
                            <TabsTrigger value="content" className="px-2 text-[.7rem]">Content</TabsTrigger>
                            <TabsTrigger value="image" className="px-2 text-[.7rem]">Image</TabsTrigger>
                            <TabsTrigger value="style" className="px-2 text-[.7rem]">Style</TabsTrigger>
                        </TabsList>

                        <TabsContent value="content" className="pt-3 flex flex-col gap-3">
                            <Tab_Content />
                        </TabsContent>

                        <TabsContent value="image" className="pt-3 flex flex-col gap-3">
                            <Tab_Image />
                        </TabsContent>

                        <TabsContent value="style" className="pt-3 flex flex-col gap-4">
                            <Tab_Style />
                        </TabsContent>
                    </Tabs>
                </div>

                <DialogFooter className="px-4 py-3 border-t">
                    <Button variant="outline" size="xs" onClick={close}>Cancel</Button>
                    <Button size="xs" onClick={() => doRflowSaveNodeEditor()}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

//---------------------------------------------------------------------------
// Tabs

function Tab_Content() {
    const [draft, setDraft] = useAtom(rf_NodeEditorDraftAtom);
    if (!draft) {
        return null;
    }

    return (<>
        <div className="flex flex-col gap-1">
            <Label>
                Label
            </Label>
            <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Node label" />
        </div>

        <div className="flex flex-col gap-1">
            <Label>
                Description
            </Label>
            <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Add a description..." className="h-24 resize-none" />
        </div>
    </>);
}

function Tab_Image() {
    const [draft, setDraft] = useAtom(rf_NodeEditorDraftAtom);
    if (!draft) {
        return null;
    }

    return (<>
        {draft.nodeType === 'group'
            ? (
                <p className="text-xs text-muted-foreground">
                    Images are not available for subgraphs.
                </p>
            )
            : (<>
                <div className="flex flex-col gap-1">
                    <Label>
                        Image URL
                    </Label>
                    <Input value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} placeholder="https://example.com/image.png" />
                </div>

                <IconSearch onSelect={(url) => setDraft({ ...draft, imageUrl: url })} />

                {draft.imageUrl && (
                    <div className="flex flex-col gap-1">
                        <Label>
                            Preview
                        </Label>
                        <img src={draft.imageUrl} alt="" className="max-h-24 object-contain border rounded" />
                    </div>
                )}
            </>)
        }
    </>);
}

function Tab_Style() {
    const [draft, setDraft] = useAtom(rf_NodeEditorDraftAtom);
    if (!draft) {
        return null;
    }

    return (<>
        <ColorField
            label="Background"
            value={draft.backgroundColor}
            presets={COLOR_PRESETS.background}
            onChange={(backgroundColor) => setDraft({ ...draft, backgroundColor })}
        />

        <ColorField
            label="Border"
            value={draft.borderColor}
            presets={COLOR_PRESETS.border}
            onChange={(borderColor) => setDraft({ ...draft, borderColor })}
        />
    </>);
}

function ColorField({ label, value, presets, onChange }: { label: string; value: string; presets: string[]; onChange: (v: string) => void; }) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label>
                {label}
            </Label>

            <div className="flex items-center gap-2">
                <input type="color" value={value === 'transparent' ? '#ffffff' : value} onChange={(e) => onChange(e.target.value)} className="size-8 rounded border cursor-pointer" />
                <Input value={value} onChange={(e) => onChange(e.target.value)} />
            </div>

            <div className="flex flex-wrap gap-1">
                {presets.map(
                    (color) => (
                        <button
                            className="size-6 rounded border hover:scale-110 transition-transform"
                            style={{ background: color === 'transparent' ? undefined : color }}
                            onClick={() => onChange(color)}
                            title={color}
                            type="button"
                            key={color}
                        />
                    )
                )}
            </div>
        </div>
    );
}
