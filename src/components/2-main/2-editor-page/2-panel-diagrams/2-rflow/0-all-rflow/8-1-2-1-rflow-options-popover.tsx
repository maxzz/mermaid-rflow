import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { Settings2Icon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/ui/shadcn/popover";
import { Switch } from "@/ui/shadcn/switch";
import { TooltipProvider } from "@/ui/shadcn/tooltip";
import { appSettings } from "@/store/1-ui-settings";
import { Row, popoverMainGridClasses } from "../../8-common-ui/popovers-ui/popovers-shared-ui";

export function RflowOptionsPopover() {
    const { rflow: { focusSelection } } = useSnapshot(appSettings);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="xs" title="Flow options" type="button">
                    <Settings2Icon />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="p-3 pt-0 w-80 max-h-[min(70vh,32rem)] overflow-y-auto rounded-sm"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <PopoverHeader>
                    <PopoverTitle className="-mx-3 px-3 pt-3 pb-2 text-xs font-medium bg-muted border-b border-border shadow-xs">
                        Flow options
                    </PopoverTitle>
                    <PopoverDescription className="text-[0.65rem] text-muted-foreground sr-only">
                        How the canvas follows a selection in the editor.
                    </PopoverDescription>
                </PopoverHeader>

                <TooltipProvider delayDuration={500}>
                    <div className={classNames(popoverMainGridClasses, "gap-x-2 gap-y-2")}>
                        <Row label="Focus selection" hint="Zoom and pan to the node or edge selected in the editor. Off keeps the current scale and position.">
                            <Switch
                                className="-mr-1 scale-65"
                                checked={focusSelection}
                                onCheckedChange={(v) => { appSettings.rflow.focusSelection = v; }}
                            />
                        </Row>
                    </div>
                </TooltipProvider>
            </PopoverContent>
        </Popover>
    );
}
