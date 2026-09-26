import { type ReactNode, useId } from "react";
import { Label } from "@/ui/shadcn/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/shadcn/tooltip";

export const popoverMainGridClasses = "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center";

export const popoverRowSubGridClasses = "min-h-6 col-span-full grid grid-cols-subgrid items-center";

export function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode; }) {
    const id = useId();
    return (
        <div className={popoverRowSubGridClasses}>
            <HintLabel htmlFor={id} hint={hint}>
                {label}
            </HintLabel>

            <div id={id} className="justify-self-end col-span-2">
                {children}
            </div>
        </div>
    );
}

export function HintLabel({ htmlFor, hint, children }: { htmlFor?: string; hint: string; children: ReactNode; }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Label htmlFor={htmlFor} className="whitespace-nowrap font-normal cursor-help">
                    {children}
                </Label>
            </TooltipTrigger>

            <TooltipContent side="left" sideOffset={8} className="whitespace-normal max-w-56 text-left z-100">
                {hint}
            </TooltipContent>
        </Tooltip>
    );
}
