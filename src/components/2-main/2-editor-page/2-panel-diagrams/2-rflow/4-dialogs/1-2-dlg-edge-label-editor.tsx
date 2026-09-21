/**
 * Adapted from mermaid-reactflow-editor (MIT).
 */
import { useEffect, useRef } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/ui/shadcn/popover';
import { Input } from '@/ui/shadcn/input';
import { Button } from '@/ui/shadcn/button';

export type EdgeLabelEditorProps = {
    open: boolean;
    x: number;
    y: number;
    text: string;
    onChange: (text: string) => void;
    onSave: () => void;
    onCancel: () => void;
};

export function EdgeLabelEditor({ open, x, y, text, onChange, onSave, onCancel }: EdgeLabelEditorProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(
        () => {
            if (!open) {
                return;
            }
            const t = setTimeout(() => inputRef.current?.focus(), 0);
            return () => clearTimeout(t);
        },
        [open],
    );

    return (
        <Popover open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
            <PopoverAnchor asChild>
                <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0 }} />
            </PopoverAnchor>
            <PopoverContent side="top" align="center" sideOffset={8} className="w-72 p-2">
                <Input
                    ref={inputRef}
                    value={text}
                    onChange={(e) => onChange(e.target.value)}
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
                <div className="flex justify-end gap-1.5">
                    <Button variant="outline" size="xs" type="button" onClick={onCancel}>Cancel</Button>
                    <Button size="xs" type="button" onClick={onSave}>Save</Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
