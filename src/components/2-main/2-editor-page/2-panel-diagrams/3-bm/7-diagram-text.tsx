import { type CSSProperties, type HTMLAttributes } from "react";
import { classNames } from "@/utils";

type DiagramTextProps = {
    text: string;
    style?: CSSProperties;
} & Omit<HTMLAttributes<HTMLPreElement>, "children">;

/**
 * Monaco paints every column at `n * cellWidth`. HTML `<pre>` uses each
 * glyph's advance, so a narrower `┆` (Courier New) or a wider `│` (Geist
 * Mono symbols) walks the rest of the line off the grid. Cascadia Mono
 * keeps letters, box-drawing, and arrows on one em; one block per row
 * pins `│` to the same line box so the stems meet instead of overlapping.
 */
export function DiagramText({ text, className, style, ...rest }: DiagramTextProps) {
    const lines = text.split("\n");
    return (
        <pre
            {...rest}
            className={classNames("m-0 text-xs leading-none font-diagram font-features-['liga'_0,'calt'_0] text-foreground [font-kerning:none] [font-variant-ligatures:none]", className)}
            style={style}
        >
            {lines.map(
                (line, i) => (
                    <span key={i} className="whitespace-pre block leading-4.5">
                        {line.length === 0 ? "\u00a0" : line}
                    </span>
                )
            )}
        </pre>
    );
}
