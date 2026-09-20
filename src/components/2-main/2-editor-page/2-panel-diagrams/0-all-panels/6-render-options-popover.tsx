import { type ReactNode, Suspense, use, useId } from "react";
import { useSnapshot } from "valtio";
import { Settings2Icon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Label } from "@/ui/shadcn/label";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/ui/shadcn/popover";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Slider } from "@/ui/shadcn/slider";
import { Switch } from "@/ui/shadcn/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";

import { DIAGRAM_FONTS, type DiagramTheme, mermaidSettings } from "@/store/2-mermaid-settings";
import { BarsLoaderIcon, PreviewSelectItem, useSelectPreview } from "@/ui/local-ui";
import { loadBeautifulMermaid } from "@/components/2-main/2-editor-page/1-panel-editor/8-lazy-modules";

export function RenderOptionsPopover() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="xs" title="Render options" type="button">
                    <Settings2Icon />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="p-3 pt-0 w-80 max-h-[min(70vh,32rem)] rounded-sm overflow-y-auto"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={keepOpenForSelect}
            >
                <PopoverHeader>
                    <PopoverTitle className="-mx-3 px-3 pt-3 text-xs font-medium bg-muted border-b border-border shadow-xs pb-2">
                        Render options
                    </PopoverTitle>
                    <PopoverDescription className="text-[0.65rem] text-muted-foreground sr-only">
                        Diagram theme, SVG layout, and text output.
                    </PopoverDescription>
                </PopoverHeader>

                <TooltipProvider delayDuration={500}>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2 gap-y-2 items-center">

                        <Suspense fallback={<div className="col-span-full py-6 flex justify-center"><BarsLoaderIcon /></div>}>
                            <DiagramThemeSection />
                        </Suspense>
                        <SvgLayoutSection />
                        <TextOutputSection />

                    </div>
                </TooltipProvider>
            </PopoverContent>
        </Popover>
    );
}

function DiagramThemeSection() {
    const bm = use(loadBeautifulMermaid());
    const { diagramTheme } = useSnapshot(mermaidSettings);
    const themeNames = Object.keys(bm.THEMES);
    const select = useSelectPreview(diagramTheme, (v) => { mermaidSettings.diagramTheme = v as DiagramTheme; });

    return (
        <Row label="Diagram theme" hint="Color palette for the diagram. Auto follows the app light or dark theme.">
            <Select value={select.listValue} open={select.open} onOpenChange={select.onOpenChange} onValueChange={select.onValueChange}>
                <SelectTrigger size="sm" className="w-40">
                    <SelectValue>
                        <ThemeLabel name={diagramTheme} themes={bm.THEMES} />
                    </SelectValue>
                </SelectTrigger>

                <SelectContent position="popper" align="end">
                    <PreviewSelectItem value="auto" onPreview={select.preview}>
                        <ThemeLabel name="auto" themes={bm.THEMES} />
                    </PreviewSelectItem>

                    {themeNames.map(
                        (name) => (
                            <PreviewSelectItem key={name} value={name} onPreview={select.preview}>
                                <ThemeLabel name={name} themes={bm.THEMES} />
                            </PreviewSelectItem>
                        )
                    )}
                </SelectContent>
            </Select>
        </Row>
    );
}

function SvgLayoutSection() {
    const { svg } = useSnapshot(mermaidSettings);
    const select = useSelectPreview(svg.font, (v) => { mermaidSettings.svg.font = v; });

    return (
        <Section title="SVG layout">
            <Row label="Font" hint="Typeface used for node labels and other diagram text.">
                <Select value={select.listValue} open={select.open} onOpenChange={select.onOpenChange} onValueChange={select.onValueChange}>
                    <SelectTrigger size="sm" className="w-40">
                        <SelectValue>
                            <FontLabel fontFamily={svg.font} />
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper" align="end">
                        {DIAGRAM_FONTS.map(
                            (font) => (
                                <PreviewSelectItem key={font.value} value={font.value} onPreview={select.preview}>
                                    <FontLabel fontFamily={font.value} />
                                </PreviewSelectItem>
                            )
                        )}
                    </SelectContent>
                </Select>
            </Row>

            <SliderRow
                label="X Padding"
                hint="Empty space around the diagram inside the SVG canvas."
                value={svg.padding}
                min={0}
                max={120}
                step={4}
                onChange={(v) => { mermaidSettings.svg.padding = v; }}
            />
            <SliderRow
                label="Y Layer spacing"
                hint="Vertical distance between successive layers of the diagram."
                value={svg.layerSpacing}
                min={4}
                max={160}
                step={4}
                onChange={(v) => { mermaidSettings.svg.layerSpacing = v; }}
            />
            <SliderRow
                label="Node spacing"
                hint="Horizontal distance between sibling nodes in the same layer."
                value={svg.nodeSpacing}
                min={4}
                max={120}
                step={4}
                onChange={(v) => { mermaidSettings.svg.nodeSpacing = v; }}
            />
        </Section>
    );
}

function TextOutputSection() {
    const { ascii } = useSnapshot(mermaidSettings);

    return (
        <Section title="Text output">
            <Row label="Pure ASCII" hint="When on, the text diagram uses only ASCII characters. Off uses Unicode box-drawing characters.">
                <Switch className="-mr-1 scale-65" checked={ascii.useAscii} onCheckedChange={(v) => { mermaidSettings.ascii.useAscii = v; }} />
            </Row>

            <SliderRow
                label="Horizontal spacing"
                hint="Horizontal padding between nodes in the text diagram."
                value={ascii.paddingX}
                min={1}
                max={20}
                step={1}
                onChange={(v) => { mermaidSettings.ascii.paddingX = v; }}
            />
            <SliderRow
                label="Vertical spacing"
                hint="Vertical padding between nodes in the text diagram."
                value={ascii.paddingY}
                min={1}
                max={20}
                step={1}
                onChange={(v) => { mermaidSettings.ascii.paddingY = v; }}
            />
        </Section>
    );
}

//---------------------------------------------------------------------------
// Components

function Section({ title, children }: { title: string; children: ReactNode; }) {
    return (
        <section className="col-span-full grid grid-cols-subgrid gap-y-1">
            <h3 className="col-span-full text-[0.7rem] font-semibold border-b border-border pb-1">
                {title}
            </h3>
            {children}
        </section>
    );
}

const optionRowClasses = "col-span-full grid grid-cols-subgrid items-center min-h-6";

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode; }) {
    const id = useId();
    return (
        <div className={optionRowClasses}>
            <HintLabel htmlFor={id} hint={hint}>
                {label}
            </HintLabel>
            <div id={id} className="col-span-2 justify-self-end">
                {children}
            </div>
        </div>
    );
}

type SliderRowProps = {
    label: string;
    hint: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
};

function SliderRow({ label, hint, value, min, max, step, onChange }: SliderRowProps) {
    return (
        <div className={optionRowClasses}>
            <HintLabel hint={hint}>{label}</HintLabel>
            <Slider className="min-w-0" value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
            <span className="min-w-9 text-right text-[.7rem] font-mono tabular-nums text-muted-foreground">{value}</span>
        </div>
    );
}

function HintLabel({ htmlFor, hint, children }: { htmlFor?: string; hint: string; children: ReactNode; }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Label htmlFor={htmlFor} className="font-normal cursor-help whitespace-nowrap">
                    {children}
                </Label>
            </TooltipTrigger>

            <TooltipContent side="left" sideOffset={8} className="z-100 max-w-56 text-left whitespace-normal">
                {hint}
            </TooltipContent>
        </Tooltip>
    );
}

function ThemeLabel({ name, themes }: { name: string; themes: Record<string, { bg: string; fg: string; accent?: string; }>; }) {
    if (name === "auto") {
        return (<>
            <ThemeSwatch bg="var(--background)" fg="var(--foreground)" /> Auto (app theme)
        </>);
    }

    const theme = themes[name];
    return (
        <>
            <ThemeSwatch bg={theme?.bg ?? "var(--background)"} fg={theme?.accent ?? theme?.fg ?? "var(--foreground)"} /> {name}
        </>
    );
}

function ThemeSwatch({ bg, fg }: { bg: string; fg: string; }) {
    return (
        <span className="w-5 h-3.5 border border-border rounded overflow-hidden inline-flex" style={{ backgroundColor: bg }}>
            <span className="m-auto w-2 h-1.5" style={{ backgroundColor: fg }} />
        </span>
    );
}

function FontLabel({ fontFamily }: { fontFamily: string; }) {
    const label = DIAGRAM_FONTS.find((font) => font.value === fontFamily)?.label ?? fontFamily;
    return <span style={{ fontFamily }}>{label}</span>;
}

//---------------------------------------------------------------------------
// Helpers

function keepOpenForSelect(event: { target: EventTarget | null; preventDefault: () => void; }) {
    const el = event.target as HTMLElement | null;
    if (el?.closest?.('[data-slot="select-content"]')) {
        event.preventDefault();
    }
}
