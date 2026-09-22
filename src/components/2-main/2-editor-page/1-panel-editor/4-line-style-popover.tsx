import { type ReactNode, useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import { TablePropertiesIcon } from 'lucide-react';
import { classNames } from '@/utils';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { Label } from '@/ui/shadcn/label';
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/ui/shadcn/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/shadcn/select';
import { Slider } from '@/ui/shadcn/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/shadcn/tooltip';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { sourceLink } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { getMonacoCursorLine } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/5-1-source-diagram-link-monaco/2-monaco-editor-handle';
import { applyMmdSourcePatch } from '@/components/2-main/2-editor-page/2-panel-diagrams/1-mmd/3-catalog/4-apply-patch';
import {
    DASH_DASHED,
    DASH_DOTTED,
    extraStyleDecls,
    fieldsForKind,
    LINK_INTERPOLATE_TYPES,
    patchStyleDirectiveAtLine,
    readStyleDirectiveAt,
    setStyleDecl,
    setStyleInterpolate,
    type StyleDirectiveLine,
    type StyleFieldSpec,
} from './4-line-style';

export function LineStylePopover() {
    const { source } = useSnapshot(mermaidSettings);
    useSnapshot(sourceLink);
    const [open, setOpen] = useState(false);
    const [lockedLine, setLockedLine] = useState<number | null>(null);

    const liveLine = sourceLink.focusLine ?? getMonacoCursorLine();
    const lineNumber = open ? lockedLine : liveLine;
    const current = lineNumber ? readDirective(source, lineNumber) : null;
    activeStyleLine = lineNumber;

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                setLockedLine(next ? (sourceLink.focusLine ?? getMonacoCursorLine()) : null);
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="xs"
                    title={current ? `${current.resolved.heading}: ${current.resolved.summary}` : 'Properties of the current style or linkStyle line'}
                    type="button"
                >
                    <TablePropertiesIcon />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="p-3 pt-0 w-80 max-h-[min(70vh,32rem)] rounded-sm overflow-y-auto"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={keepOpenForSelect}
            >
                <LineStyleBody current={current} />
            </PopoverContent>
        </Popover>
    );
}

type CurrentDirective = NonNullable<ReturnType<typeof readStyleDirectiveAt>> & { lineNumber: number; };

function LineStyleBody({ current }: { current: CurrentDirective | null; }) {
    const fields = current ? fieldsForKind(current.parsed.kind) : [];
    const extras = current ? extraStyleDecls(current.parsed, fields) : [];

    return (
        <>
            <PopoverHeader>
                <PopoverTitle className="-mx-3 px-3 pt-3 pb-2 text-xs font-medium bg-muted border-b border-border shadow-xs flex items-center justify-between gap-2">
                    {current?.resolved.heading ?? 'Line properties'}
                    {current && (
                        <span className="font-mono text-[0.65rem] text-muted-foreground">
                            {current.parsed.kind}
                        </span>
                    )}
                </PopoverTitle>
                <PopoverDescription className="pt-1 text-[0.65rem] text-muted-foreground">
                    {current
                        ? current.resolved.summary
                        : 'Place the caret on a style or linkStyle line to inspect its properties.'}
                </PopoverDescription>
            </PopoverHeader>

            {current && (
                <TooltipProvider delayDuration={500}>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2 gap-y-2 items-center">
                        {current.parsed.kind === 'linkStyle' && (
                            <InterpolateRow value={current.parsed.interpolate} />
                        )}
                        {fields.map((field) => (
                            <FieldRow key={field.key} field={field} value={current.parsed.decls[field.key]} />
                        ))}
                        {extras.map(([key, value]) => (
                            <TextRow key={key} label={key} hint="Custom declaration on this line." value={value} onCommit={(next) => patchDecl(key, next)} />
                        ))}
                    </div>
                </TooltipProvider>
            )}
        </>
    );
}

function FieldRow({ field, value }: { field: StyleFieldSpec; value: string | undefined; }) {
    switch (field.kind) {
        case 'color':
            return <ColorRow label={field.label} hint={field.hint} value={value} onCommit={(next) => patchDecl(field.key, next)} />;
        case 'width':
            return <WidthRow label={field.label} hint={field.hint} value={value} />;
        case 'dash':
            return <DashRow label={field.label} hint={field.hint} value={value} />;
        default:
            return <TextRow label={field.label} hint={field.hint} value={value ?? ''} onCommit={(next) => patchDecl(field.key, next)} />;
    }
}

function ColorRow({ label, hint, value, onCommit }: { label: string; hint: string; value: string | undefined; onCommit: (value: string | undefined) => void; }) {
    const hex = toHexColor(value);
    return (
        <div className={optionRowClasses}>
            <HintLabel hint={hint}>{label}</HintLabel>
            <div className="justify-self-end col-span-2 flex items-center gap-1.5">
                <input
                    type="color"
                    aria-label={label}
                    className="p-0.5 size-6 bg-background border border-border rounded-sm cursor-pointer"
                    style={{ opacity: hex ? 1 : 0.4 }}
                    value={hex ?? '#64748b'}
                    onChange={(e) => onCommit(e.target.value)}
                />
                <DeclText value={value ?? ''} placeholder="unset" className="w-28" onCommit={onCommit} />
            </div>
        </div>
    );
}

function WidthRow({ label, hint, value }: { label: string; hint: string; value: string | undefined; }) {
    const width = parseWidth(value) ?? 2;
    return (
        <div className={optionRowClasses}>
            <HintLabel hint={hint}>{label}</HintLabel>
            <Slider
                className="min-w-0"
                min={1}
                max={8}
                step={1}
                value={[width]}
                onValueChange={([next]) => {
                    if (next != null) {
                        patchDecl('stroke-width', `${next}px`);
                    }
                }}
            />
            <span className="min-w-9 font-mono tabular-nums text-[.7rem] text-right text-muted-foreground">
                {value ?? 'unset'}
            </span>
        </div>
    );
}

function DashRow({ label, hint, value }: { label: string; hint: string; value: string | undefined; }) {
    const preset = dashPreset(value);
    return (
        <>
            <div className={optionRowClasses}>
                <HintLabel hint={hint}>{label}</HintLabel>
                <div className="justify-self-end col-span-2 grid grid-cols-3 gap-1">
                    {DASHES.map((item) => (
                        <Button
                            key={item.value}
                            type="button"
                            variant={preset === item.value ? 'secondary' : 'ghost'}
                            size="xs"
                            onClick={() => patchDecl('stroke-dasharray', item.pattern)}
                        >
                            {item.label}
                        </Button>
                    ))}
                </div>
            </div>
            {preset === 'custom' && (
                <TextRow label="Dash array" hint="Raw stroke-dasharray value." value={value ?? ''} onCommit={(next) => patchDecl('stroke-dasharray', next)} />
            )}
        </>
    );
}

function InterpolateRow({ value }: { value: string | undefined; }) {
    const current = value || NONE;
    const options = LINK_INTERPOLATE_TYPES.includes(current as typeof LINK_INTERPOLATE_TYPES[number])
        ? LINK_INTERPOLATE_TYPES
        : value
            ? [value, ...LINK_INTERPOLATE_TYPES]
            : LINK_INTERPOLATE_TYPES;

    return (
        <div className={optionRowClasses}>
            <HintLabel hint="d3 curve used to draw the link. Combined with CSS on the same linkStyle line.">
                Interpolate
            </HintLabel>
            <div className="justify-self-end col-span-2">
                <Select
                    value={current}
                    onValueChange={(next) => patchCurrent((line) => setStyleInterpolate(line, next === NONE ? undefined : next))}
                >
                    <SelectTrigger size="sm" className="w-36">
                        <SelectValue>{value ?? 'Unset'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper" align="end">
                        <SelectItem value={NONE}>Unset</SelectItem>
                        {options.map((item) => (
                            <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

function TextRow({ label, hint, value, onCommit }: { label: string; hint: string; value: string; onCommit: (value: string | undefined) => void; }) {
    return (
        <div className={optionRowClasses}>
            <HintLabel hint={hint}>{label}</HintLabel>
            <div className="justify-self-end col-span-2">
                <DeclText value={value} placeholder="unset" className="w-36" onCommit={onCommit} />
            </div>
        </div>
    );
}

function DeclText({
    value,
    placeholder,
    className,
    onCommit,
}: {
    value: string;
    placeholder?: string;
    className?: string;
    onCommit: (value: string | undefined) => void;
}) {
    const [draft, setDraft] = useState(value);
    useEffect(() => { setDraft(value); }, [value]);

    function commit() {
        const next = draft.trim();
        const current = value.trim();
        if (next === current) {
            return;
        }
        onCommit(next || undefined);
    }

    return (
        <Input
            className={classNames('px-1.5 h-6 font-mono', className)}
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.currentTarget.blur();
                }
            }}
        />
    );
}

function HintLabel({ hint, children }: { hint: string; children: ReactNode; }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Label className="font-normal whitespace-nowrap cursor-help">
                    {children}
                </Label>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8} className="max-w-56 text-left whitespace-normal z-100">
                {hint}
            </TooltipContent>
        </Tooltip>
    );
}

let activeStyleLine: number | null = null;

function readDirective(source: string, lineNumber: number): CurrentDirective | null {
    const read = readStyleDirectiveAt(source, lineNumber);
    if (!read) {
        return null;
    }
    return { lineNumber, ...read };
}

function currentLineNumber(): number | null {
    return activeStyleLine ?? sourceLink.focusLine ?? getMonacoCursorLine();
}

function patchCurrent(mutator: (line: StyleDirectiveLine) => StyleDirectiveLine) {
    const lineNumber = currentLineNumber();
    if (!lineNumber) {
        return;
    }
    const next = patchStyleDirectiveAtLine(mermaidSettings.source, lineNumber, mutator);
    if (next !== mermaidSettings.source) {
        applyMmdSourcePatch(next);
    }
}

function patchDecl(key: string, value: string | undefined) {
    patchCurrent((line) => setStyleDecl(line, key, value));
}

function toHexColor(raw: string | undefined): string | null {
    if (!raw) {
        return null;
    }
    const hex6 = raw.match(/^#([\da-f]{6})$/i);
    if (hex6) {
        return `#${hex6[1]!.toLowerCase()}`;
    }
    const hex3 = raw.match(/^#([\da-f]{3})$/i);
    if (hex3) {
        const [r, g, b] = hex3[1]!;
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return null;
}

function parseWidth(raw: string | undefined): number | null {
    if (!raw) {
        return null;
    }
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : null;
}

function dashPreset(value: string | undefined): 'solid' | 'dashed' | 'dotted' | 'custom' {
    if (!value || value === 'none' || value === '0') {
        return 'solid';
    }
    const normalized = value.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (normalized === DASH_DASHED) {
        return 'dashed';
    }
    if (normalized === DASH_DOTTED) {
        return 'dotted';
    }
    return 'custom';
}

const DASHES: { value: 'solid' | 'dashed' | 'dotted'; label: string; pattern: string | undefined; }[] = [
    { value: 'solid', label: 'Solid', pattern: undefined },
    { value: 'dashed', label: 'Dashed', pattern: DASH_DASHED },
    { value: 'dotted', label: 'Dotted', pattern: DASH_DOTTED },
];

const NONE = '__none__';
const optionRowClasses = 'col-span-full grid grid-cols-subgrid items-center min-h-6';

function keepOpenForSelect(event: { target: EventTarget | null; preventDefault: () => void; }) {
    const el = event.target as HTMLElement | null;
    if (el?.closest?.('[data-slot="select-content"]')) {
        event.preventDefault();
    }
}
