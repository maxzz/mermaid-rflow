import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { type Edge } from 'reactflow';
import { Popover, PopoverAnchor, PopoverContent } from '@/ui/shadcn/popover';
import { Input } from '@/ui/shadcn/input';
import { Button } from '@/ui/shadcn/button';
import { rf_Diagram, setRflowEdges } from '../8-store/a-0-flow-diagram';
import { syncMermaidFromGraph } from '../8-store/a-7-sync-with-source';
import { rf_EdgeLabelEditorAtom } from '../8-store/a-1-rflow-ui-atoms';

export function EdgeLabelEditorDialog() {
    const [editor, setEditor] = useAtom(rf_EdgeLabelEditorAtom);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const open = editor !== null;

    useEffect(
        () => {
            if (!open) {
                return;
            }
            const t = setTimeout(() => inputRef.current?.focus(), 0);
            return () => clearTimeout(t);
        },
        [open]);

    if (!editor) {
        return null;
    }

    const current = editor;

    function onSave() {
        setRflowEdges((rf_Diagram.edges as Edge[]).map((edge) => (edge.id === current.edgeId ? { ...edge, label: current.text } : edge)));
        setEditor(null);
        syncMermaidFromGraph();
    }

    function onCancel() {
        setEditor(null);
    }

    return (
        <Popover open onOpenChange={(next) => { if (!next) onCancel(); }}>
            <PopoverAnchor asChild>
                <div style={{ position: 'absolute', left: current.x, top: current.y, width: 0, height: 0 }} />
            </PopoverAnchor>

            <PopoverContent side="top" align="center" sideOffset={8} className="p-2 w-72">
                <Input
                    ref={inputRef}
                    value={current.text}
                    onChange={(e) => setEditor({ ...current, text: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            onSave();
                        }
                        if (e.key === 'Escape') {
                            onCancel();
                        }
                    }}
                    placeholder="Edge label"
                />
                <div className="flex gap-1.5 justify-end">
                    <Button variant="outline" size="xs" type="button" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button size="xs" type="button" onClick={onSave}>
                        Save
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
