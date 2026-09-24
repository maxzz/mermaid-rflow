import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { CopyIcon, DownloadIcon, FolderOpenIcon, Grid3x3Icon, ImageIcon, MapIcon, SaveIcon } from "lucide-react";
import { DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuSeparator } from "@/ui/shadcn/dropdown-menu";
import { TabDropdownMenu } from "@/ui/local-ui/8-tab-dropdown-menu";
import { appSettings } from "@/store/1-ui-settings";
import { copyFlowJson, exportFlowJson, saveCurrentFlow } from "../../3-bm/8-save-export-rflow";
import { rf_LoadDialogOpenAtom, rf_CanvasMethodsAtom } from "../8-store/a-rflow-ui-atoms";

export function PreviewToolbar_Rflow() {
    const setLoadOpen = useSetAtom(rf_LoadDialogOpenAtom);
    const methods = useAtomValue(rf_CanvasMethodsAtom);
    const { rflow } = useSnapshot(appSettings);

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

            <DropdownMenuSeparator />

            <DropdownMenuCheckboxItem
                checked={rflow.showBgGrid}
                onCheckedChange={(checked) => { appSettings.rflow.showBgGrid = checked === true; }}
                onSelect={(e) => e.preventDefault()}
            >
                <Grid3x3Icon />
                Show background grid
            </DropdownMenuCheckboxItem>

            <DropdownMenuCheckboxItem
                checked={rflow.showMinimap}
                onCheckedChange={(checked) => { appSettings.rflow.showMinimap = checked === true; }}
                onSelect={(e) => e.preventDefault()}
            >
                <MapIcon />
                Show minimap
            </DropdownMenuCheckboxItem>
        </TabDropdownMenu>
    );
}
