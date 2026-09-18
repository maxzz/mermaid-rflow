/**
 * beautiful-mermaid's flowchart ASCII path uses `getCorners()` for every
 * rectangle, including `[[subroutine]]` nodes. In Unicode mode those corners
 * are `╟`/`╢` (double-vertical tees). Mixed with single `│`/`─` they look
 * broken at the corners; doubling the sides (`││`) makes verticals even
 * thicker. Rewrite to a matching single-line box (`┌┐└┘` / ASCII `+`).
 *
 * Also: a vertical through a horizontal is often left as `|`/`│` instead of
 * a crossing, so a later row's box top looks like a gap in the bar.
 */

const BOX_TOP = new Set(["┌", "╭", "╔", "╒", "╓", "+", "|", "╟"]);

export function fixMermaidAsciiBoxes(text: string): string {
    const rows = text.split("\n").map((line) => [...line]);
    if (rows.length === 0) {
        return text;
    }

    const boxes = findBoxes(rows);
    for (const box of boxes) {
        applyBoxCorners(rows, box);
    }
    patchCrossings(rows);
    return rows.map((row) => row.join("")).join("\n");
}

type Box = {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    unicode: boolean;
};

function findBoxes(rows: string[][]): Box[] {
    const boxes: Box[] = [];
    const seen = new Set<string>();

    for (let y = 0; y < rows.length; y++) {
        const row = rows[y];
        for (let x = 0; x < row.length; x++) {
            const ch = row[x];
            const unicode = ch === "╟";
            if (ch !== "|" && !unicode) {
                continue;
            }
            if (x + 1 >= row.length) {
                continue;
            }
            const next = row[x + 1];
            if (next !== "-" && next !== "─") {
                continue;
            }

            let x2 = -1;
            for (let i = x + 2; i < row.length; i++) {
                const end = row[i];
                if ((unicode && end === "╢") || (!unicode && end === "|")) {
                    x2 = i;
                    break;
                }
                if (end !== "-" && end !== "─") {
                    break;
                }
            }
            if (x2 < 0) {
                continue;
            }

            const bottom = findMatchingBottom(rows, x, x2, y + 1, unicode);
            if (bottom < 0) {
                continue;
            }

            const key = `${x},${y},${x2},${bottom}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            boxes.push({ x1: x, x2, y1: y, y2: bottom, unicode });
        }
    }

    return boxes;
}

function findMatchingBottom(rows: string[][], x1: number, x2: number, startY: number, unicode: boolean): number {
    for (let y = startY; y < rows.length; y++) {
        const row = rows[y];
        if (row.length <= x2) {
            continue;
        }
        const left = row[x1];
        const right = row[x2];
        const isBottom = unicode
            ? (left === "╟" || left === "└" || left === "╰") && (right === "╢" || right === "┘" || right === "╯")
            : left === "|" && right === "|";
        if (!isBottom) {
            continue;
        }
        const between = row.slice(x1 + 1, x2);
        if (between.length === 0) {
            continue;
        }
        const bar = unicode ? "─" : "-";
        if (between.every((ch) => ch === bar)) {
            return y;
        }
    }
    return -1;
}

function applyBoxCorners(rows: string[][], box: Box): void {
    const { x1, x2, y1, y2, unicode } = box;
    const top = unicode ? (["┌", "┐"] as const) : (["+", "+"] as const);
    const bottom = unicode ? (["└", "┘"] as const) : (["+", "+"] as const);
    const side = unicode ? "│" : "|";

    rows[y1][x1] = top[0];
    rows[y1][x2] = top[1];
    rows[y2][x1] = bottom[0];
    rows[y2][x2] = bottom[1];

    for (let y = y1 + 1; y < y2; y++) {
        const row = rows[y];
        if (row.length <= x2) {
            continue;
        }
        if (row[x1] === " " || row[x1] === "|" || row[x1] === "│") {
            row[x1] = side;
        }
        if (row[x2] === " " || row[x2] === "|" || row[x2] === "│") {
            row[x2] = side;
        }
    }
}

function patchCrossings(rows: string[][]): void {
    for (let y = 1; y < rows.length - 1; y++) {
        const row = rows[y];
        const above = rows[y - 1];
        const below = rows[y + 1];
        for (let x = 1; x < row.length - 1; x++) {
            const ch = row[x];
            if (ch !== "|" && ch !== "│") {
                continue;
            }
            const left = row[x - 1];
            const right = row[x + 1];
            const up = above[x];
            const down = below[x];
            const h = (left === "-" || left === "─") && (right === "-" || right === "─");
            const v = BOX_TOP.has(up ?? "") || up === "|" || up === "│" || up === "┼" || up === "+"
                || BOX_TOP.has(down ?? "") || down === "|" || down === "│" || down === "┼" || down === "+";
            if (h && v) {
                row[x] = ch === "│" ? "┼" : "+";
            }
        }
    }
}

/*
import { renderMermaidASCII } from "beautiful-mermaid";
import { fixMermaidAsciiBoxes } from "./fix-mermaid-ascii.ts";
const src = `graph TD
    subgraph ctx [1-context-script]
        A[0-client-entry.ts]
        B[bridge.ts]
    end
    subgraph dt [DevTools - not a page worker]
        C[panel - 0-editor-ui]
    end
    subgraph sw [2-service-worker - not a page]
        D[[index.ts]]
    end
    A --> C
    B -->|executeScript| D
    C <-->|port| sw
`;
const raw = renderMermaidASCII(src, { useAscii: false, colorMode: "none" });
const fixed = fixMermaidAsciiBoxes(raw);
process.stdout.write("--- RAW ---\n");
process.stdout.write(raw + "\n");
process.stdout.write("--- FIXED ---\n");
process.stdout.write(fixed + "\n");
process.stdout.write(`has corner ${raw.includes("╟")} after ${fixed.includes("╟")}\n`);

┌─────────────────────────────────────────────────────────────────────┐                          ┌─────────────────────────┐
│                          1-context-script                           │                          │DevTools — not a page wor│
│                                                                     │                          │                         │
│                                                                     │                          │                         │
│ ┌───────────────────────┐             ┌───────────────────────────┐ │                          │ ┌─────────────────────┐ │
│ │                       │             │                           │ │                          │ │                     │ │
│ │   0-client-entry.ts   │             │         bridge.ts         │ │             ┌────────────┼─┤ panel · 0-editor-ui │ │
│ │                       │             │                           │ │             │            │ │                     │ │
│ └───────────┬───────────┘             └─────────────┬─────────────┘ │             │            │ └──────────▲──────────┘ │
│             ┆                                       ┆               │             │            │            │            │
└─────────────┆───────────────────────────────────────┆───────────────┘             │            └────────────┼────────────┘
              ┆                                       ┆                             │                port devtools-page     
              ┆                                       ┆                             │                         │             
              ┌─────────────────────────────────────────────────────────────────────┘                         │             
┌───inspectedWindow.eval──────────────────────────────┆───────────────┐                          ┌────────────┼────────────┐
│             │      Inspected tab — two JS worlds    ┆               │                          │2-service-worker — not a │
│             │                                       ┆               │                          │            │            │
│             ▼                                       ▼               │                          │            ▼            │
│ ┌───────────────────────┐             ┌───────────────────────────┐ │                          │ ┌─────────────────────┐ │
│ │                       │             │                           │ │                          │ │                     │ │
│ │ MAIN · page-client.js ◄─postMessage►│ ISOLATED · page-bridge.js ◄executeScport─clientISOLATED┼►┤       index.ts      │ │
│ │                       │             │                           │ │                          │ │                     │ │
│ └───────────────────────┘             └───────────────────────────┘ │                          │ └─────────────────────┘ │
│                                                                     │                          │                         │
└─────────────────────────────────────────────────────────────────────┘                          └─────────────────────────┘
*/
