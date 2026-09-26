import { classNames } from "@/utils";

const dotClasses = {
    idle: "bg-muted-foreground/40",
    ok: "bg-emerald-500",
    error: "bg-red-500",
} as const;

export type StatusBarFrameProps = {
    error: string | null;
    empty: boolean;
    ms: number;
    converting: boolean;
    busyLabel: string;
    doneVerb: string;
    engine: string;
};

export function StatusBarFrame({ error, empty, ms, converting, busyLabel, doneVerb, engine }: StatusBarFrameProps) {
    const state = converting ? "ok" : error ? "error" : empty ? "idle" : "ok";
    const label = converting ? busyLabel : state === "error" ? `Error: ${error}` : state === "idle" ? "Ready" : "OK";

    return (
        <div className="px-3 h-6 text-[.7rem] text-muted-foreground bg-muted/30 border-t border-border flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-1.5">
                <span className={classNames("shrink-0 size-1.5 rounded-full", converting ? "bg-amber-500" : dotClasses[state])} />
                <span className="truncate" title={error ?? undefined}>
                    {label}
                </span>
            </div>

            <div className="shrink-0 flex items-center gap-3">
                {state === "ok" && !converting && (
                    <span className="tabular-nums">
                        {doneVerb} in {ms.toFixed(0)} ms
                    </span>
                )}
                <span>{engine}</span>
            </div>
        </div>
    );
}
