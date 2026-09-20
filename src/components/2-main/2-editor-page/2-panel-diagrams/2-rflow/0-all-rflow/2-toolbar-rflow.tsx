import { useAtomValue, useSetAtom } from "jotai";
import { DownloadIcon, FolderOpenIcon, ImageIcon, SaveIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { exportFlowJson, saveCurrentFlow } from "../../4-common/3-rflow-save-export";
import { rflowLoadDialogOpenAtom, rflowCanvasMethodsAtom } from "../store/a-rflow-ui";

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
        <Button variant="ghost" size="xs" onClick={exportFlowJson} title="Export JSON">
            <DownloadIcon />
        </Button>
        <Button variant="ghost" size="xs" onClick={() => void methods.exportImage?.()} title="Export canvas PNG">
            <ImageIcon />
        </Button>
    </>);
}
