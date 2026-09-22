import { useAtomValue, useSetAtom } from "jotai";
import { CopyIcon, DownloadIcon, FolderOpenIcon, ImageIcon, SaveIcon } from "lucide-react";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/ui/shadcn/dropdown-menu";
import { TabDropdownMenu } from "@/ui/local-ui/8-tab-dropdown-menu";
import { copyFlowJson, exportFlowJson, saveCurrentFlow } from "../../3-bm/8-save-export-rflow";
import { rflowLoadDialogOpenAtom, rflowCanvasMethodsAtom } from "../8-store/a-rflow-ui";

export function PreviewToolbar_Rflow() {
    const setLoadOpen = useSetAtom(rflowLoadDialogOpenAtom);
    const methods = useAtomValue(rflowCanvasMethodsAtom);

    return (
        <TabDropdownMenu>
            <DropdownMenuItem onSelect={saveCurrentFlow}>
                <SaveIcon />
                Save diagram
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={() => setLoadOpen(true)}>
                <FolderOpenIcon />
                Load diagram
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

            <DropdownMenuItem onSelect={() => void methods.exportImage?.()}>
                <ImageIcon />
                Export PNG
            </DropdownMenuItem>
        </TabDropdownMenu>
    );
}
