import { useSnapshot } from "valtio";
import { StatusBarFrame } from "../../4-common/5-status-bar-frame";
import { rflowDiagram } from "../store/1-flow-diagram";

export function StatusBar_Rflow() {
    const { error, nodes, ms, converting } = useSnapshot(rflowDiagram);

    return (
        <StatusBarFrame
            error={error}
            empty={nodes.length === 0 && !error}
            ms={ms}
            converting={converting}
            busyLabel="Converting…"
            doneVerb="Converted"
            engine="reactflow"
        />
    );
}
