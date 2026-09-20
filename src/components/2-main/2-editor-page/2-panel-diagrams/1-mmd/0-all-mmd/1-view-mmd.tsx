import { useSnapshot } from "valtio";
import { mermaidSettings, OutputFormat } from "@/store/2-mermaid-settings";
import { ErrorBoundary } from "@/ui/local-ui/8-error-boundary";
import { MermaidView } from "../canvas/MermaidView";
import { useMountedOnce } from "@/utils/util-hooks/use-mounted-once";
import { canvasTabClass, PanelFallbackMessage } from "../../../../../../ui/local-ui/1-4-view-shared";

export function Preview_Mmd() {
    const { outputFormat } = useSnapshot(mermaidSettings);
    const active = outputFormat === OutputFormat.mmd;
    const mounted = useMountedOnce(active);
    if (!mounted) {
        return null;
    }

    return (
        <div className={canvasTabClass(active)} aria-hidden={!active} inert={!active || undefined}>
            <ErrorBoundary fallback={<PanelFallbackMessage>Failed to load the official Mermaid renderer.</PanelFallbackMessage>}>
                <MermaidView active={active} />
            </ErrorBoundary>
        </div>
    );
}
