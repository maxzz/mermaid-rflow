import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { WorkflowIcon } from "lucide-react";

import { Button } from "@/ui/shadcn/button";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/ui/shadcn/popover";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Switch } from "@/ui/shadcn/switch";
import { TooltipProvider } from "@/ui/shadcn/tooltip";
import { Row, SliderRow, popoverMainGridClasses } from "../../8-common-ui/popovers-ui/popovers-shared-ui";

import {
    type ConsiderModelOrder,
    type CycleBreakingStrategy,
    type NodePlacementStrategy,
    CONSIDER_MODEL_ORDERS,
    CYCLE_BREAKING_STRATEGIES,
    mermaidSettings,
    NODE_PLACEMENT_STRATEGIES,
    resetSvgElkLayout,
} from "@/store/2-mermaid-settings";
import { PreviewSelectItem, useSelectPreview } from "@/ui/local-ui";

export function SvgLayoutEnginePopover() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="xs" title="SVG layout engine" type="button">
                    <WorkflowIcon />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="p-3 pt-0 w-80 max-h-[min(70vh,32rem)] rounded-sm overflow-y-auto"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={keepOpenForSelect}
            >
                <PopoverHeader>
                    <PopoverTitle className="-mx-3 px-3 pt-3 pb-2 text-xs font-medium bg-muted border-b border-border shadow-xs flex items-center justify-between gap-2">
                        SVG layout engine
                        <Button
                            className="-mr-1 px-1.5 h-5 text-[0.65rem] text-muted-foreground"
                            variant="ghost"
                            size="xs"
                            type="button"
                            onClick={() => resetSvgElkLayout()}
                        >
                            Reset
                        </Button>
                    </PopoverTitle>
                    <PopoverDescription className="text-[0.65rem] text-muted-foreground sr-only">
                        ELK options used when rendering the SVG diagram. The text renderer uses a separate layout.
                    </PopoverDescription>
                </PopoverHeader>

                <TooltipProvider delayDuration={500}>
                    <div className={classNames(popoverMainGridClasses, "gap-x-2 gap-y-2")}>
                        <SvgElkOptions />
                    </div>
                </TooltipProvider>
            </PopoverContent>
        </Popover>
    );
}

function SvgElkOptions() {
    const { svg } = useSnapshot(mermaidSettings);
    const { elk } = svg;
    const placement = useSelectPreview(elk.nodePlacementStrategy, (v) => { mermaidSettings.svg.elk.nodePlacementStrategy = v as NodePlacementStrategy; });
    const cycle = useSelectPreview(elk.cycleBreakingStrategy, (v) => { mermaidSettings.svg.elk.cycleBreakingStrategy = v as CycleBreakingStrategy; });
    const modelOrder = useSelectPreview(elk.considerModelOrder, (v) => { mermaidSettings.svg.elk.considerModelOrder = v as ConsiderModelOrder; });

    return (<>
        <SelectRow
            label="Cycle breaking"
            hint="How ELK breaks loops. Greedy model order follows the source text and usually matches the text renderer."
            select={cycle}
            values={CYCLE_BREAKING_STRATEGIES}
            labels={CYCLE_BREAKING_LABELS}
        />
        <SelectRow
            label="Node placement"
            hint="Algorithm that positions nodes inside each layer."
            select={placement}
            values={NODE_PLACEMENT_STRATEGIES}
            labels={NODE_PLACEMENT_LABELS}
        />
        <SelectRow
            label="Model order"
            hint="How much the node and edge order in the source is preserved when that does not add crossings."
            select={modelOrder}
            values={CONSIDER_MODEL_ORDERS}
            labels={MODEL_ORDER_LABELS}
        />
        <Row label="Force model order" hint="Keep the source node order even when a different order would reduce crossings.">
            <Switch className="-mr-1 scale-65" checked={elk.forceNodeModelOrder} onCheckedChange={(v) => { mermaidSettings.svg.elk.forceNodeModelOrder = v; }} />
        </Row>
        <Row label="Merge edges" hint="Share a path when several edges go to or from the same node. Easier on the eye, sometimes harder to follow.">
            <Switch className="-mr-1 scale-65" checked={elk.mergeEdges} onCheckedChange={(v) => { mermaidSettings.svg.elk.mergeEdges = v; }} />
        </Row>
        <SliderRow
            label="Thoroughness"
            hint="Crossing-minimization trials. Higher can improve the layout but takes longer."
            value={elk.thoroughness}
            min={1}
            max={7}
            step={1}
            onChange={(v) => { mermaidSettings.svg.elk.thoroughness = v; }}
        />
    </>);
}

const NODE_PLACEMENT_LABELS: Record<NodePlacementStrategy, string> = {
    SIMPLE: "Simple",
    NETWORK_SIMPLEX: "Network simplex",
    LINEAR_SEGMENTS: "Linear segments",
    BRANDES_KOEPF: "Brandes-Koepf",
};

const CYCLE_BREAKING_LABELS: Record<CycleBreakingStrategy, string> = {
    GREEDY: "Greedy",
    DEPTH_FIRST: "Depth first",
    INTERACTIVE: "Interactive",
    MODEL_ORDER: "Model order",
    GREEDY_MODEL_ORDER: "Greedy model order",
};

const MODEL_ORDER_LABELS: Record<ConsiderModelOrder, string> = {
    NONE: "None",
    NODES_AND_EDGES: "Nodes and edges",
    PREFER_EDGES: "Prefer edges",
    PREFER_NODES: "Prefer nodes",
};

//---------------------------------------------------------------------------
// Components

type SelectPreview = ReturnType<typeof useSelectPreview>;

function SelectRow<T extends string>({ label, hint, select, values, labels }: { label: string; hint: string; select: SelectPreview; values: readonly T[]; labels: Record<T, string>; }) {
    return (
        <Row label={label} hint={hint}>
            <Select value={select.listValue} open={select.open} onOpenChange={select.onOpenChange} onValueChange={select.onValueChange}>
                <SelectTrigger size="sm" className="w-44 h-5!">
                    <SelectValue>
                        {labels[select.listValue as T] ?? select.listValue}
                    </SelectValue>
                </SelectTrigger>
                
                <SelectContent position="popper" align="end">
                    {values.map(
                        (value) => (
                            <PreviewSelectItem key={value} value={value} onPreview={select.preview}>
                                {labels[value]}
                            </PreviewSelectItem>
                        )
                    )}
                </SelectContent>
            </Select>
        </Row>
    );
}

function keepOpenForSelect(event: { target: EventTarget | null; preventDefault: () => void; }) {
    const el = event.target as HTMLElement | null;
    if (el?.closest?.('[data-slot="select-content"]')) {
        event.preventDefault();
    }
}
