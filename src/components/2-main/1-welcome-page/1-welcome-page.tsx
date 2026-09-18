import { useEffect, useId } from "react";
import { useSnapshot } from "valtio";
import { mermaidSettings } from "@/store/2-mermaid-settings";
import { useNavigateToPage } from "@/store/4-ui-atoms";
import { preloadEditorPageModules } from "@/components/2-main/2-editor-page/1-panel-editor/8-lazy-modules";
import { Button } from "@/ui/shadcn/button";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Label } from "@/ui/shadcn/label";
import { Section3_Footer } from "@/components/3-footer";
import { AppLogo, APP_NAME } from "./0-app-logo";

export function WelcomePage() {
    const navigate = useNavigateToPage();

    // Warm up Monaco and the renderer while the user reads the welcome text
    useEffect(() => preloadEditorPageModules(), []);

    return (
        <div className="min-h-dvh text-foreground bg-background grid grid-rows-[1fr_auto]">

            <div className="px-6 py-12 text-center flex flex-col items-center justify-center gap-6">
                <AppLogo className="size-40 text-primary" />

                <h1 className="text-4xl font-heading font-semibold tracking-tight">
                    {APP_NAME}
                </h1>

                <Button className="px-6 h-9 text-sm" onClick={() => navigate('main')} autoFocus>
                    Open editor
                </Button>

                <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
                    Write Mermaid diagrams in a Monaco editor and see them rendered live as clean SVG or as Unicode/ASCII text.
                    Switch light and dark mode, pick a diagram theme, then copy or export the result as SVG, PNG, or plain text.
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
