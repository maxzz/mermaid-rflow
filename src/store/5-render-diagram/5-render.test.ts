import { describe, expect, it } from "vitest";
import { type BeautifulMermaidModule } from "@/components/2-main/2-editor-page/1-panel-editor/8-lazy-modules";
import { buildSvgOptions, isolateFromAppTheme } from "./5-render";

const UNSET = "initial";

const bm = {
    DEFAULTS: { bg: "#FFFFFF", fg: "#27272A" },
    THEMES: {
        "zinc-light": { bg: "#FFFFFF", fg: "#27272A" },
        "tokyo-night": {
            bg: "#1a1b26",
            fg: "#a9b1d6",
            line: "#3d59a1",
            accent: "#7aa2f7",
            muted: "#565f89",
        },
    },
} as unknown as BeautifulMermaidModule;

const svg = {
    font: "Geist Variable",
    padding: 40,
    nodeSpacing: 24,
    layerSpacing: 40,
    elk: {
        mergeEdges: true,
        thoroughness: 3,
        nodePlacementStrategy: "BRANDES_KOEPF" as const,
        cycleBreakingStrategy: "GREEDY_MODEL_ORDER" as const,
        considerModelOrder: "NODES_AND_EDGES" as const,
        forceNodeModelOrder: false,
    },
};

const ascii = { useAscii: false, paddingX: 5, paddingY: 5 };

describe("isolateFromAppTheme", () => {
    it("unsets optional vars that collide with shadcn tokens", () => {
        expect(isolateFromAppTheme({ bg: "#fff", fg: "#111" })).toEqual({
            bg: "#fff",
            fg: "#111",
            line: UNSET,
            accent: UNSET,
            muted: UNSET,
            surface: UNSET,
            border: UNSET,
        });
    });

    it("keeps enrichment colors supplied by a named theme", () => {
        const colors = isolateFromAppTheme({
            bg: "#1a1b26",
            fg: "#a9b1d6",
            line: "#3d59a1",
            accent: "#7aa2f7",
            muted: "#565f89",
        });
        expect(colors.accent).toBe("#7aa2f7");
        expect(colors.muted).toBe("#565f89");
        expect(colors.line).toBe("#3d59a1");
        expect(colors.surface).toBe(UNSET);
        expect(colors.border).toBe(UNSET);
    });
});

describe("buildSvgOptions", () => {
    it("does not let zinc-light inherit app --accent/--muted", () => {
        const options = buildSvgOptions(bm, { diagramTheme: "zinc-light", ascii, svg }, false);
        expect(options.bg).toBe("#FFFFFF");
        expect(options.fg).toBe("#27272A");
        expect(options.accent).toBe(UNSET);
        expect(options.muted).toBe(UNSET);
        expect(options.border).toBe(UNSET);
        expect(options.transparent).toBe(false);
    });

    it("preserves tokyo-night accent so arrows stay theme-colored", () => {
        const options = buildSvgOptions(bm, { diagramTheme: "tokyo-night", ascii, svg }, false);
        expect(options.accent).toBe("#7aa2f7");
        expect(options.muted).toBe("#565f89");
    });

    it("isolates auto the same way so live CSS vars still mix from bg/fg", () => {
        const options = buildSvgOptions(bm, { diagramTheme: "auto", ascii, svg }, false);
        expect(options.bg).toBe("var(--background)");
        expect(options.fg).toBe("var(--foreground)");
        expect(options.accent).toBe(UNSET);
        expect(options.transparent).toBe(true);
    });

    it("uses default hex colors for auto export when CSS vars are unavailable", () => {
        const options = buildSvgOptions(bm, { diagramTheme: "auto", ascii, svg }, true);
        expect(options.bg).toBe("#FFFFFF");
        expect(options.fg).toBe("#27272A");
        expect(options.transparent).toBe(false);
    });
});
