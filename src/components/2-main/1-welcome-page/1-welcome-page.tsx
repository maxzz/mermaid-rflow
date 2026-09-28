import { useEffect, useId } from "react";
import { useSnapshot } from "valtio";
import { mermaidSettings } from "@/store/2-mermaid-settings";
import { preloadEditorPageModules } from "@/components/2-main/1-welcome-page/8-lazy-modules";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Label } from "@/ui/shadcn/label";
import { Section3_Footer } from "@/components/3-footer";
import { SwampEnterButton } from "./3-swamp-enter-button";
import { JumpingOctopusLogo, SwampTitle } from "./4-jumping-octopus-logo";
import "./1-welcome-page.css";

export function WelcomePage() {
    // Warm up Monaco and the renderer while the user reads the welcome text
    useEffect(
        () => preloadEditorPageModules(),
        []);

    return (
        <div className="min-h-dvh text-foreground bg-background welcome-light-bg grid grid-rows-[1fr_auto]">

            <div className="px-6 py-12 text-center flex flex-col items-center justify-center gap-6">
                <div className="relative pb-16 w-full max-w-md flex flex-col items-center gap-6" data-swamp-hero>
                    <SwampEnterButton className="absolute inset-0 size-full" />

                    <JumpingOctopusLogo />

                    <SwampTitle />
                </div>

                <p className="max-w-md text-sm text-foreground dark:text-muted-foreground leading-relaxed">
                    One diagram source code — different engines. Creating clear workflow diagrams is challenging, and each tool renders them differently.
                    Compare how <span className="text-lime-600">mermaid.ai</span>, <span className="text-lime-600">react-flow</span>, and <span className="text-lime-600">Beautiful Mermaid</span> visualize the same Mermaid code.
                    Additionally, <span className="text-lime-600">Beautiful Mermaid</span> offers a text-based rendering option, allowing you to easily insert clean diagrams directly into any text file without requiring plugins to display them.
                </p>

                <DontShowAgainCheckbox />
            </div>

            <Section3_Footer className="welcome-footer border-t-0" />
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
            <Label htmlFor={id} className="text-xs text-foreground dark:text-muted-foreground cursor-pointer">
                Don't show it again at start
            </Label>
        </div>
    );
}
