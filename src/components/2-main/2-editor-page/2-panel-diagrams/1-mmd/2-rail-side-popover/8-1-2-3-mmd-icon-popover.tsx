import { useState } from 'react';
import { CloudIcon } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/ui/shadcn/popover';
import { insertMmdPaletteNode } from '../3-catalog/4-apply-patch';

const ICONS: { icon: string; label: string; }[] = [
    { icon: 'fa:fa-star', label: 'Star' },
    { icon: 'fa:fa-user', label: 'User' },
    { icon: 'fa:fa-heart', label: 'Heart' },
    { icon: 'fa:fa-check', label: 'Check' },
    { icon: 'fa:fa-car', label: 'Car' },
    { icon: 'fa:fa-home', label: 'Home' },
    { icon: 'fa:fa-envelope', label: 'Mail' },
    { icon: 'fa:fa-cog', label: 'Settings' },
    { icon: 'fa:fa-bell', label: 'Bell' },
    { icon: 'fa:fa-flag', label: 'Flag' },
    { icon: 'fa:fa-cloud', label: 'Cloud' },
    { icon: 'fa:fa-image', label: 'Image' },
];

export function IconPopover({ enabled }: { enabled: boolean; }) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-sm" disabled={!enabled} title="Add an icon" aria-label="Add an icon">
                    <CloudIcon />
                </Button>
            </PopoverTrigger>

            <PopoverContent side="right" align="center" className="p-2 w-52">
                <PopoverHeader>
                    <PopoverTitle>Icons</PopoverTitle>
                    <PopoverDescription className="text-[0.65rem] text-muted-foreground">
                        Inserted as mermaid <span className="font-mono">fa:fa-*</span> labels.
                    </PopoverDescription>
                </PopoverHeader>

                <div className="grid grid-cols-2 gap-1">
                    {ICONS.map(
                        (item) => (
                            <Button
                                key={item.icon}
                                variant="ghost"
                                size="sm"
                                className="h-7 justify-start px-2 text-[.7rem]"
                                onClick={() => {
                                    insertMmdPaletteNode({ shape: 'icon', icon: item.icon, label: item.label });
                                    setOpen(false);
                                }}
                            >
                                {item.label}
                            </Button>
                        )
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
