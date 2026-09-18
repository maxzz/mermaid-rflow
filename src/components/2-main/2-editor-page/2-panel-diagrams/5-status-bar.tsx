import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { previewStatus } from "@/store/5-render-diagram/5-render";

export function StatusBar() {
    const { error, ms, empty } = useSnapshot(previewStatus);

    const state = error ? 'error' : empty ? 'idle' : 'ok';

    return (
        <div className="px-3 h-6 text-[.7rem] text-muted-foreground bg-muted/30 border-t border-border flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-1.5">
                <span className={classNames("shrink-0 size-1.5 rounded-full", dotClasses[state])} />
                <span className="truncate" title={error ?? undefined}>
                    {state === 'error' ? `Error: ${error}` : state === 'idle' ? 'Ready' : 'OK'}
                </span>
            </div>

            <div className="shrink-0 flex items-center gap-3">
                {state === 'ok' && (
                    <span className="tabular-nums">
                        Rendered in {ms.toFixed(0)} ms
                    </span>
                )}
                <span>beautiful-mermaid</span>
            </div>
        </div>
    );
}

const dotClasses = {
    idle: "bg-muted-foreground/40",
    ok: "bg-emerald-500",
    error: "bg-red-500",
} as const;
