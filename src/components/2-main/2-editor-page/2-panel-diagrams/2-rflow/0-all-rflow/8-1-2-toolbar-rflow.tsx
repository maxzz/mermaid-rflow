import { useAtomValue, useSetAtom } from "jotai";
import { CopyIcon, DownloadIcon, FolderOpenIcon, ImageIcon, SaveIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/ui/shadcn/dropdown-menu";
import { CopyExportMenu } from "../../0-all-panels/8-copy-export-menu";
import { copyFlowJson, exportFlowJson, saveCurrentFlow } from "../../4-common/3-rflow-save-export";
import { rflowLoadDialogOpenAtom, rflowCanvasMethodsAtom } from "../8-store/a-rflow-ui";

export function PreviewToolbar_Rflow() {
    const setLoadOpen = useSetAtom(rflowLoadDialogOpenAtom);
    const methods = useAtomValue(rflowCanvasMethodsAtom);

    return (<>
        <Button variant="ghost" size="xs" onClick={saveCurrentFlow} title="Save diagram (Mermaid + canvas layout)">
            <SaveIcon />
        </Button>
        <Button variant="ghost" size="xs" onClick={() => setLoadOpen(true)} title="Load a saved diagram">
            <FolderOpenIcon />
        </Button>

        <CopyExportMenu>
            <DropdownMenuItem onSelect={() => void copyFlowJson()}>
                <CopyIcon />
                Copy JSON
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={exportFlowJson}>
                <DownloadIcon />
                Export JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void methods.exportImage?.()}>
                <ImageIcon />
                Export PNG
            </DropdownMenuItem>
        </CopyExportMenu>
    </>);
}
