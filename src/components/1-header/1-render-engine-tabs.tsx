import { useSnapshot } from "valtio";
import { Tabs } from "@/ui/shadcn/tabs";
import { TabsListAnimated, TabsTriggerAnimated } from "@/ui/local-ui/5-tabs-animated";
import { mermaidSettings, OutputFormat } from "@/store/2-mermaid-settings";

export function RenderEngineTabs() {
    const { outputFormat } = useSnapshot(mermaidSettings);

    return (
        <Tabs value={outputFormat} onValueChange={(v) => { mermaidSettings.outputFormat = v as OutputFormat; }}>
            <TabsListAnimated layoutId="render-engine" className="p-0.5 h-6!">
                <TabsTriggerAnimated value={OutputFormat.mmd} selectedValue={outputFormat} className="px-2 text-[.7rem]">Mermaid</TabsTriggerAnimated>
                <TabsTriggerAnimated value={OutputFormat.flow} selectedValue={outputFormat} className="px-2 text-[.7rem]">Flow</TabsTriggerAnimated>
                <TabsTriggerAnimated value={OutputFormat.svg} selectedValue={outputFormat} className="px-2 text-[.7rem]">SVG</TabsTriggerAnimated>
                <TabsTriggerAnimated value={OutputFormat.text} selectedValue={outputFormat} className="px-2 text-[.7rem]">Text</TabsTriggerAnimated>
            </TabsListAnimated>
        </Tabs>
    );
}
