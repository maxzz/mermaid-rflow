/**
 * Adapted from mermaid-reactflow-editor (MIT).
 */
import { useMemo } from 'react';
import { type Node } from 'reactflow';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/ui/shadcn/command';

export type NodeSearchDialogProps = {
    open: boolean;
    nodes: Node[];
    onOpenChange: (open: boolean) => void;
    onSelectNode: (nodeId: string) => void;
};

export function NodeSearchDialog({ open, nodes, onOpenChange, onSelectNode }: NodeSearchDialogProps) {
    const { nodeItems, subgraphItems, conditionItems } = useMemo(
        () => {
            const n: Array<{ id: string; label: string; }> = [];
            const s: Array<{ id: string; label: string; }> = [];
            const c: Array<{ id: string; label: string; }> = [];
            nodes.forEach((node) => {
                const label = (node.data?.label as string) || node.id;
                if (node.type === 'group' || node.data?.isSubgraph) {
                    s.push({ id: node.id, label });
                } else if (node.type === 'diamond' || node.data?.shape === 'diamond') {
                    c.push({ id: node.id, label });
                } else {
                    n.push({ id: node.id, label });
                }
            });
            n.sort((a, b) => a.label.localeCompare(b.label));
            s.sort((a, b) => a.label.localeCompare(b.label));
            c.sort((a, b) => a.label.localeCompare(b.label));
            return { nodeItems: n, subgraphItems: s, conditionItems: c };
        },
        [nodes],
    );

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search nodes and subgraphs">
            <CommandInput placeholder="Search nodes and subgraphs..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                {conditionItems.length > 0 && (
                    <CommandGroup heading="Conditions">
                        {conditionItems.map((item) => (
                            <CommandItem key={item.id} value={`${item.label} ${item.id}`} onSelect={() => onSelectNode(item.id)}>
                                <span className="truncate" title={item.label}>{item.label}</span>
                                <span className="ml-auto text-[.65rem] text-muted-foreground">{item.id}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
                {(conditionItems.length > 0 && (subgraphItems.length > 0 || nodeItems.length > 0)) && <CommandSeparator />}
                {subgraphItems.length > 0 && (
                    <CommandGroup heading="Subgraphs">
                        {subgraphItems.map((item) => (
                            <CommandItem key={item.id} value={`${item.label} ${item.id}`} onSelect={() => onSelectNode(item.id)}>
                                <span className="truncate" title={item.label}>{item.label}</span>
                                <span className="ml-auto text-[.65rem] text-muted-foreground">{item.id}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
                {subgraphItems.length > 0 && nodeItems.length > 0 && <CommandSeparator />}
                {nodeItems.length > 0 && (
                    <CommandGroup heading="Nodes">
                        {nodeItems.map((item) => (
                            <CommandItem key={item.id} value={`${item.label} ${item.id}`} onSelect={() => onSelectNode(item.id)}>
                                <span className="truncate" title={item.label}>{item.label}</span>
                                <span className="ml-auto text-[.65rem] text-muted-foreground">{item.id}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    );
}
