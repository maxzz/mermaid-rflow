import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { useSnapshot } from 'valtio';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/ui/shadcn/command';

import { type Node, useReactFlow } from 'reactflow';
import { rf_Diagram, setRflowNodes } from '../8-store/a-0-flow-diagram';
import { rf_SearchDialogOpenAtom } from '../8-store/a-1-rflow-ui-atoms';

export function NodeSearchDialog() {
    const [open, setOpen] = useAtom(rf_SearchDialogOpenAtom);
    const { nodes } = useSnapshot(rf_Diagram);
    const reactFlowInstance = useReactFlow();

    const plainNodes = nodes as Node[];

    const { nodeItems, subgraphItems, conditionItems } = useMemo(
        () => {
            const n: Array<{ id: string; label: string; }> = [];
            const s: Array<{ id: string; label: string; }> = [];
            const c: Array<{ id: string; label: string; }> = [];

            plainNodes.forEach((node) => {
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
        [plainNodes]);

    function selectNode(nodeId: string) {
        reactFlowInstance.fitView({ nodes: [{ id: nodeId }], duration: 600, padding: 0.3 });

        setRflowNodes(
            (rf_Diagram.nodes as Node[]).map(
                (node) => (node.id === nodeId ? { ...node, style: { ...node.style, outline: '3px solid #ff6b6b' } } : node)
            ),
        );

        window.setTimeout(
            () => {
                setRflowNodes(
                    (rf_Diagram.nodes as Node[]).map(
                        (node) => (node.id === nodeId ? { ...node, style: { ...node.style, outline: undefined } } : node)
                    ),
                );
            },
            1200);

        setOpen(false);
    }

    return (
        <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search nodes and subgraphs">
            <CommandInput placeholder="Search nodes and subgraphs..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                {conditionItems.length > 0 && (
                    <CommandGroup heading="Conditions">
                        {conditionItems.map(
                            (item) => (
                                <CommandItem key={item.id} value={`${item.label} ${item.id}`} onSelect={() => selectNode(item.id)}>
                                    <span className="truncate" title={item.label}>{item.label}</span>
                                    <span className="ml-auto text-[.65rem] text-muted-foreground">{item.id}</span>
                                </CommandItem>
                            )
                        )}
                    </CommandGroup>
                )}

                {(conditionItems.length > 0 && (subgraphItems.length > 0 || nodeItems.length > 0)) && <CommandSeparator />}
                {subgraphItems.length > 0 && (
                    <CommandGroup heading="Subgraphs">
                        {subgraphItems.map(
                            (item) => (
                                <CommandItem key={item.id} value={`${item.label} ${item.id}`} onSelect={() => selectNode(item.id)}>
                                    <span className="truncate" title={item.label}>{item.label}</span>
                                    <span className="ml-auto text-[.65rem] text-muted-foreground">{item.id}</span>
                                </CommandItem>
                            )
                        )}
                    </CommandGroup>
                )}

                {subgraphItems.length > 0 && nodeItems.length > 0 && <CommandSeparator />}
                {nodeItems.length > 0 && (
                    <CommandGroup heading="Nodes">
                        {nodeItems.map(
                            (item) => (
                                <CommandItem key={item.id} value={`${item.label} ${item.id}`} onSelect={() => selectNode(item.id)}>
                                    <span className="truncate" title={item.label}>{item.label}</span>
                                    <span className="ml-auto text-[.65rem] text-muted-foreground">{item.id}</span>
                                </CommandItem>
                            )
                        )}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    );
}
