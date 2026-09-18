import { ConfirmationDialog } from "@/components/4-dialogs/8-1-confirmation/0-confirmation-dialog";
import { LoginDialog } from "@/components/4-dialogs/8-2-login/0-login-dialog";
import { OptionsDialog } from "@/components/4-dialogs/1-options/0-options-dialog";
import { ExportDialog } from "@/components/4-dialogs/2-export/0-export-dialog";

export function AllDialogs() {
    return (<>
        <OptionsDialog />
        <ExportDialog />
        <ConfirmationDialog />
        <LoginDialog />
    </>);
}
