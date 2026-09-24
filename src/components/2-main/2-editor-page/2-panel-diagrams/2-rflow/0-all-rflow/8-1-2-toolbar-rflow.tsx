import { useAtomValue, useSetAtom } from "jotai";
import { CopyIcon, DownloadIcon, FolderOpenIcon, ImageIcon, SaveIcon } from "lucide-react";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/ui/shadcn/dropdown-menu";
import { TabDropdownMenu } from "@/ui/local-ui/8-tab-dropdown-menu";
import { copyFlowJson, exportFlowJson, saveCurrentFlow } from "../../3-bm/8-save-export-rflow";
import { rf_LoadDialogOpenAtom, rf_CanvasMethodsAtom } from "../8-store/a-rflow-ui-atoms";

export function PreviewToolbar_Rflow() {
    const setLoadOpen = useSetAtom(rf_LoadDialogOpenAtom);
    const methods = useAtomValue(rf_CanvasMethodsAtom);

    return (
        <TabDropdownMenu>
            <DropdownMenuItem onSelect={() => setLoadOpen(true)}>
                <FolderOpenIcon />
                Load diagram
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={saveCurrentFlow}>
                <SaveIcon />
                Save diagram
            </DropdownMenuItem>

            <DropdownMenuSeparator />

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
        </TabDropdownMenu>
    );
}
