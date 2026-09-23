import { useId } from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Label } from "@/ui/shadcn/label";
import { Switch } from "@/ui/shadcn/switch";
import { mermaidSettings } from "@/store/2-mermaid-settings";
import { isOpenOptionsDialogAtom } from "./a-types-options";

export function OptionsDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenOptionsDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! max-w-sm gap-0!" aria-describedby={DESCRIPTION_ID}>

                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm">
                        Options
                    </DialogTitle>
                    <DialogDescription id={DESCRIPTION_ID} className="sr-only">
                        Startup options. Changes apply immediately.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 py-4 flex flex-col gap-5">
                    <StartupSection />
                </div>
            </DialogContent>
        </Dialog>
    );
}

const DESCRIPTION_ID = "options-dialog-description";

function StartupSection() {
    const { showWelcome } = useSnapshot(mermaidSettings);
    const id = useId();

    return (
        <section className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-foreground border-b pb-1">
                Startup
            </h3>

            <div className="flex items-center justify-between gap-4">
                <Label htmlFor={id}>
                    Show welcome page at start
                </Label>

                <Switch className="scale-65" id={id} checked={showWelcome} onCheckedChange={(v) => { mermaidSettings.showWelcome = v; }} />
            </div>
        </section>
    );
}
