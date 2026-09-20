import { useSnapshot } from "valtio";
import { mermaidSettings } from "@/store/2-mermaid-settings";
import { ErrorBoundary } from "@/ui/local-ui/8-error-boundary";
import { FlowDiagram } from "../canvas/FlowDiagram";
import { canvasTabClass, PanelMessage, useMountedOnce } from "../../1-4-view-shared";

export function Preview_Flow() {
    const { outputFormat } = useSnapshot(mermaidSettings);
    const active = outputFormat === 'flow';
    const mounted = useMountedOnce(active);
    if (!mounted) {
        return null;
    }

    return (
        <div className={canvasTabClass(active)} aria-hidden={!active} inert={!active || undefined}>
            <ErrorBoundary fallback={<PanelMessage>Failed to load the React Flow canvas.</PanelMessage>}>
                <FlowDiagram active={active} />
            </ErrorBoundary>
        </div>
    );
}
