import { mermaidSettings } from "@/store/2-mermaid-settings";
import { MERMAID_SAMPLES } from "@/utils/local/mermaid-samples";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { LineStylePopover } from "./2-2-0-line-style-popover";

export function EditorToolbar() {
    return (
        <div className="px-3 h-9 bg-muted/30 border-b border-border flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
                Editor
            </span>

            <div className="flex items-center gap-1">
                <LineStylePopover />

                <Select value="" onValueChange={(name) => loadSample(name)}>
                    <SelectTrigger size="sm" className="h-6! text-[.7rem]" title="Replace the source with a sample diagram">
                        <SelectValue placeholder="Samples" />
                    </SelectTrigger>

                    <SelectContent position="popper" align="end">
                        {MERMAID_SAMPLES.map(
                            (sample) => (
                                <SelectItem key={sample.name} value={sample.name}>
                                    {sample.name}
                                </SelectItem>
                            )
                        )}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

function loadSample(name: string) {
    const sample = MERMAID_SAMPLES.find((s) => s.name === name);
    if (sample) {
        mermaidSettings.source = sample.source;
    }
}
