import { useSnapshot } from "valtio";
import { StatusBarFrame } from "../../4-common/5-status-bar-frame";
import { mmdDiagram } from "../8-store/1-mmd-diagram";

export function StatusBar_Mmd() {
    const { error, svg, ms, rendering } = useSnapshot(mmdDiagram);

    return (
        <StatusBarFrame
            error={error}
            empty={!svg && !error}
            ms={ms}
            converting={rendering}
            busyLabel="Rendering…"
            doneVerb="Rendered"
            engine="mermaid"
        />
    );
}
