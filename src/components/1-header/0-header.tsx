import { useSetAtom } from "jotai";
import { SlidersHorizontalIcon } from "lucide-react";
import { AppPage, useNavigateToPage } from "@/store/4-ui-app-page-atoms";
import { isOpenOptionsDialogAtom } from "@/components/4-dialogs/1-options/a-types-options";
import { Button } from "@/ui/shadcn/button";
import { AppLogo, APP_NAME } from "@/components/2-main/1-welcome-page/2-app-logo";
import { ButtonThemeToggle } from "./8-btn-theme-toggle";
import { RenderEngineTabs } from "./1-render-engine-tabs";

export function Header() {
    const navigate = useNavigateToPage();
    const setOpenOptions = useSetAtom(isOpenOptionsDialogAtom);

    return (
        <header className="px-3 h-11 bg-background border-b border-border flex items-center justify-between">

            <div className="flex items-center gap-1">
                <button
                    className="px-1 py-0.5 text-sm font-heading font-semibold text-foreground hover:bg-muted rounded flex items-center gap-2 cursor-pointer"
                    onClick={() => navigate(AppPage.welcome)}
                    title="Back to the welcome page"
                    type="button"
                >
                    <AppLogo className="size-6 text-primary" />
                    <span className="text-[0.6rem] font-medium text-green-800 uppercase">
                        {APP_NAME}
                    </span>
                </button>

                <RenderEngineTabs />
            </div>

            <div className="flex items-center gap-1">
                <Button
                    className="size-6 rounded"
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpenOptions(true)}
                    title="Options"
                    type="button"
                >
                    <SlidersHorizontalIcon className="size-3.5" />
                </Button>

                <ButtonThemeToggle />
            </div>
        </header>
    );
}
