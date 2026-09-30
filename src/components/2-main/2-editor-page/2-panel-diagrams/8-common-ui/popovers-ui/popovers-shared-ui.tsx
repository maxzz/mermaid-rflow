import { type ReactNode, useId } from "react";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Label } from "@/ui/shadcn/label";
import { Slider } from "@/ui/shadcn/slider";
import { Switch } from "@/ui/shadcn/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { useSelectPreview } from "@/ui/local-ui";

export const popoverMainGridClasses = "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center";

export const popoverRowSubGridClasses = "min-h-6 col-span-full grid grid-cols-subgrid items-center";

//---------------------------------------------------------------------------

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

//---------------------------------------------------------------------------
// Slider

type SliderRowProps = {
    label: string;
    hint: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
};

export function SliderRow({ label, hint, value, min, max, step, onChange }: SliderRowProps) {
    return (
        <div className={popoverRowSubGridClasses}>
            <HintLabel hint={hint}>
                {label}
            </HintLabel>

            <Slider className="min-w-0" value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
            <span className="min-w-9 text-[.7rem] font-mono tabular-nums text-right text-muted-foreground">{value}</span>
        </div>
    );
}

//---------------------------------------------------------------------------
// Select with preview

export type SelectPreview = ReturnType<typeof useSelectPreview>;

export function PreviewSelect({ select, liveLabel, disabled, children }: { select: SelectPreview; liveLabel: string; disabled?: boolean; children: ReactNode; }) {
    return (
        <Select value={select.listValue} open={select.open} onOpenChange={select.onOpenChange} onValueChange={select.onValueChange} disabled={disabled}>
            <SelectTrigger size="sm" className="w-40" disabled={disabled}>
                <SelectValue>
                    {liveLabel}
                </SelectValue>
            </SelectTrigger>

            <SelectContent position="popper" align="end">
                {children}
            </SelectContent>
        </Select>
    );
}

//---------------------------------------------------------------------------

type SwitchRowProps = {
    label: string;
    hint: string;
    checked: boolean;
    onCheckedChange: (value: boolean) => void;
};

export function SwitchRow({ label, hint, checked, onCheckedChange }: SwitchRowProps) {
    return (
        <Row label={label} hint={hint}>
            <Switch className="-mr-1 scale-65" checked={checked} onCheckedChange={onCheckedChange} />
        </Row>
    );
}

//---------------------------------------------------------------------------

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
