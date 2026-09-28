import { useEffect, useId } from "react";
import { useSnapshot } from "valtio";
import { mermaidSettings } from "@/store/2-mermaid-settings";
import { preloadEditorPageModules } from "@/components/2-main/1-welcome-page/8-lazy-modules";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Label } from "@/ui/shadcn/label";
import { Section3_Footer } from "@/components/3-footer";
import { SwampEnterButton } from "./3-swamp-enter-button";
import { JumpingOctopusLogo, SwampTitle } from "./4-jumping-octopus-logo";

export function WelcomePage() {
    // Warm up Monaco and the renderer while the user reads the welcome text
    useEffect(
        () => preloadEditorPageModules(),
        []);

    return (
        <div className="min-h-dvh text-foreground bg-background grid grid-rows-[1fr_auto]">

            <div className="px-6 py-12 text-center flex flex-col items-center justify-center gap-6">
                <div className="relative pb-16 w-full max-w-md flex flex-col items-center gap-6" data-swamp-hero>
                    <SwampEnterButton className="absolute inset-0 size-full" />

                    <JumpingOctopusLogo />

                    <SwampTitle />
                </div>

                <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
                    Write Mermaid in a Monaco editor and preview it as an editable React Flow canvas, official mermaid-js SVG with layout editing, or beautiful-mermaid SVG / Unicode text.
                    Switch light and dark mode, then copy or export the result.
                </p>

                <DontShowAgainCheckbox />
            </div>

            <Section3_Footer className="border-t-0" />
        </div>
    );
}

function DontShowAgainCheckbox() {
    const { showWelcome } = useSnapshot(mermaidSettings);
    const id = useId();

    return (
        <div className="flex items-center gap-2">
            <Checkbox
                id={id}
                checked={!showWelcome}
                onCheckedChange={(checked) => { mermaidSettings.showWelcome = checked !== true; }}
            />
            <Label htmlFor={id} className="text-xs text-muted-foreground cursor-pointer">
                Don't show it again at start
            </Label>
        </div>
    );
}
