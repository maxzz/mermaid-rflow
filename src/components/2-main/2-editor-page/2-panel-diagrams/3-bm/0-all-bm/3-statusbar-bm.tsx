import { useSnapshot } from "valtio";
import { previewStatus } from "@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/5-render-diagram/5-render";
import { StatusBarFrame } from "../../4-common/5-status-bar-frame";

export function StatusBar_Bm() {
    const { error, empty, ms } = useSnapshot(previewStatus);

    return (
        <StatusBarFrame
            error={error}
            empty={empty}
            ms={ms}
            converting={false}
            busyLabel="Rendering…"
            doneVerb="Rendered"
            engine="beautiful-mermaid"
        />
    );
}
