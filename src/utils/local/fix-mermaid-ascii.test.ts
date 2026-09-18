import { describe, expect, it } from "vitest";
import { fixMermaidAsciiBoxes } from "./fix-mermaid-ascii";

describe("fixMermaidAsciiBoxes", () => {
    it("rewrites unicode subroutine corners to a single-line box", () => {
        const input = [
            "╟───────────╢",
            "│  index.ts │",
            "╟───────────╢",
        ].join("\n");

        expect(fixMermaidAsciiBoxes(input)).toBe(
            [
                "┌───────────┐",
                "│  index.ts │",
                "└───────────┘",
            ].join("\n"),
        );
    });

    it("rewrites ascii |---| boxes to +---+", () => {
        const input = [
            "  |-----------|  ",
            "  |  index.ts |  ",
            "  |-----------|  ",
        ].join("\n");

        expect(fixMermaidAsciiBoxes(input)).toBe(
            [
                "  +-----------+  ",
                "  |  index.ts |  ",
                "  +-----------+  ",
            ].join("\n"),
        );
    });

    it("turns a vertical through a horizontal into a crossing", () => {
        const input = [
            "    |    ",
            "----|----",
            "    |    ",
        ].join("\n");

        expect(fixMermaidAsciiBoxes(input)).toBe(
            [
                "    |    ",
                "----+----",
                "    |    ",
            ].join("\n"),
        );
    });

    it("turns a unicode vertical through a horizontal into a crossing", () => {
        const input = [
            "    │    ",
            "────│────",
            "    │    ",
        ].join("\n");

        expect(fixMermaidAsciiBoxes(input)).toBe(
            [
                "    │    ",
                "────┼────",
                "    │    ",
            ].join("\n"),
        );
    });

    it("is idempotent", () => {
        const input = [
            "┌───────────┐",
            "│  index.ts │",
            "└───────────┘",
        ].join("\n");

        expect(fixMermaidAsciiBoxes(fixMermaidAsciiBoxes(input))).toBe(input);
    });
});
