import { type ReactNode } from "react";
import { EllipsisVerticalIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";

export function CopyExportMenu({ children }: { children: ReactNode; }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="xs" type="button" title="Copy and export">
                    <EllipsisVerticalIcon />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-44">
                {children}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
