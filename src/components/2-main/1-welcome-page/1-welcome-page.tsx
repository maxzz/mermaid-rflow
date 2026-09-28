import { useEffect, useId } from "react";
import { useSnapshot } from "valtio";
import { mermaidSettings } from "@/store/2-mermaid-settings";
import { preloadEditorPageModules } from "@/components/0-all/8-lazy-modules";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Label } from "@/ui/shadcn/label";
import { Section3_Footer } from "@/components/3-footer";
import { SwampEnterButton } from "./3-swamp-enter-button";
import { JumpingOctopusLogo } from "./4-jumping-octopus-logo";
import "./8-welcome-bkg.css";
import { summonOctopusAtom } from "./a-swamp-atoms";
import { useSetAtom } from "jotai";
import { APP_NAME } from "./2-app-logo";

export function WelcomePage() {
    // Warm up Monaco and the renderer while the user reads the welcome text
    useEffect(
        () => preloadEditorPageModules(),
        []);

    return (
        <div className="min-h-dvh text-foreground bg-background welcome-light-bg grid grid-rows-[1fr_auto]">

            <div className="px-6 pt-12 pb-1 text-center flex flex-col items-center justify-center gap-6">

                <div className="relative pb-16 w-full max-w-md flex flex-col items-center gap-6" data-swamp-hero>
                    <SwampEnterButton className="absolute inset-0 size-full" />
                    <JumpingOctopusLogo />
                    <SwampTitle />
                </div>

                <p className="max-w-md text-sm font-medium text-lime-900 dark:text-lime-700 leading-relaxed">
                    One diagram source - different rendering engines, and each of them visualizes it in its own way.
                    Compare how <Link href={links.mermaid}>mermaid.ai</Link>, <Link href={links.reactflow}>reactflow.dev</Link>, and <Link href={links.beautifulmermaid}>beautiful-mermaid</Link> visualize the same Mermaid code.
                    In addition, <Link href={links.beautifulmermaid}>beautiful-mermaid</Link> offers a text-based representation that allows diagrams to be embedded in any text file without the need for plugins to display them.
                </p>

            </div>
            <DontShowAgainCheckbox />

            <Section3_Footer className="welcome-footer border-t-0" />
        </div>
    );
}

function Link({ children, href }: { children: React.ReactNode, href: string; }) {
    return (
        <a href={href} className={linksClasses} target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    );
}

const links = {
    mermaid: "https://mermaid.ai",
    reactflow: "https://reactflow.dev",
    beautifulmermaid: "https://github.com/lukilabs/beautiful-mermaid",
};

const linksClasses = "text-lime-700 hover:text-lime-800 hover:underline";

function DontShowAgainCheckbox() {
    const { showWelcome } = useSnapshot(mermaidSettings);
    const id = useId();

    return (
        <div className="mx-4 flex items-center gap-2">
            <Checkbox
                id={id}
                checked={!showWelcome}
                onCheckedChange={(checked) => { mermaidSettings.showWelcome = checked !== true; }}
            />
            <Label htmlFor={id} className="text-xs font-normal text-foreground dark:text-muted-foreground cursor-pointer">
                Don't show it again at start
            </Label>
        </div>
    );
}

/** The app name; clicking it calls the octopus out of the swamp (or sends it in if it is on shore). */
export function SwampTitle() {
    const summon = useSetAtom(summonOctopusAtom);

    return (
        <h1 className="relative text-4xl font-heading font-semibold tracking-tight text-green-800 uppercase z-10">
            <button className="uppercase cursor-pointer" type="button" onClick={() => summon()} title="Call the octopus">
                {APP_NAME}
            </button>
        </h1>
    );
}
