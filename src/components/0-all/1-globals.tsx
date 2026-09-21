import { ConfirmationDialog } from "@/components/4-dialogs/8-1-confirmation/0-confirmation-dialog";
import { LoginDialog } from "@/components/4-dialogs/8-2-login/0-login-dialog";
import { OptionsDialog } from "@/components/4-dialogs/1-options/0-options-dialog";
import { ExportDialog } from "@/components/4-dialogs/2-export/0-export-dialog";
import { LoadDialog } from "@/components/2-main/2-editor-page/2-panel-diagrams/2-rflow/4-dialogs/7-dlg-load";

export function AllDialogs() {
    return (<>
        <OptionsDialog />
        <LoadDialog />
        <ExportDialog />
        <ConfirmationDialog />
        <LoginDialog />
    </>);
}
