import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { mermaidSettings, OutputFormat } from "@/store/2-mermaid-settings";
import { previewStatus } from "@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/5-render-diagram/5-render";
import { rflowDiagram } from "../2-rflow/store/1-flow-diagram";
import { mmdDiagram } from "../1-mmd/store/1-mmd-diagram";

export function StatusBar() {
    const { outputFormat } = useSnapshot(mermaidSettings);
    const isFlow = outputFormat === OutputFormat.flow;
    const isMmd = outputFormat === OutputFormat.mmd;
    const bm = useSnapshot(previewStatus);
    const flow = useSnapshot(rflowDiagram);
    const mmd = useSnapshot(mmdDiagram);

    const error = isFlow ? flow.error : isMmd ? mmd.error : bm.error;
    const empty = isFlow ? flow.nodes.length === 0 && !flow.error : isMmd ? !mmd.svg && !mmd.error : bm.empty;
    const ms = isFlow ? flow.ms : isMmd ? mmd.ms : bm.ms;
    const converting = isFlow ? flow.converting : isMmd && mmd.rendering;
    const state = converting ? 'ok' : error ? 'error' : empty ? 'idle' : 'ok';
    const label = converting ? (isMmd ? 'Rendering…' : 'Converting…') : state === 'error' ? `Error: ${error}` : state === 'idle' ? 'Ready' : 'OK';

    return (
        <div className="px-3 h-6 text-[.7rem] text-muted-foreground bg-muted/30 border-t border-border flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-1.5">
                <span className={classNames("shrink-0 size-1.5 rounded-full", converting ? "bg-amber-500" : dotClasses[state])} />
                <span className="truncate" title={error ?? undefined}>
                    {label}
                </span>
            </div>

            <div className="shrink-0 flex items-center gap-3">
                {state === 'ok' && !converting && (
                    <span className="tabular-nums">
                        {isFlow ? 'Converted' : 'Rendered'} in {ms.toFixed(0)} ms
                    </span>
                )}
                <span>{isFlow ? 'reactflow' : isMmd ? 'mermaid' : 'beautiful-mermaid'}</span>
            </div>
        </div>
    );
}

const dotClasses = {
    idle: "bg-muted-foreground/40",
    ok: "bg-emerald-500",
    error: "bg-red-500",
} as const;
