import fs from "node:fs";

function fmt(raw) {
    let v = parseFloat(raw) * 1.2;
    v = Math.round(v * 1000) / 1000;
    const half = Math.round(v * 2) / 2;
    if (Math.abs(v - half) < 0.002) v = half;
    return String(v);
}

function scalePath(d) {
    let out = "";
    const re = /-?\d*\.?\d+/g;
    let last = 0;
    let m;
    while ((m = re.exec(d))) {
        out += d.slice(last, m.index);
        const num = fmt(m[0]);
        const prev = out.slice(-1);
        if (num[0] !== "-" && /[\d.]/.test(prev)) out += " ";
        out += num;
        last = m.index + m[0].length;
    }
    return out + d.slice(last);
}

const icons = [
    {
        file: "1-align-left.tsx",
        name: "IconAlignLeft",
        paths: [
            "M3.333 3.333v13.334",
            "M15.208 4.792H8.125c-.92 0-1.667.746-1.667 1.666v.417c0 .92.747 1.667 1.667 1.667h7.083c.92 0 1.667-.747 1.667-1.667v-.417c0-.92-.746-1.666-1.667-1.666Z",
            "M12.516 11.458H8.125c-.92 0-1.667.746-1.667 1.667v.417c0 .92.747 1.666 1.667 1.666h4.391c.92 0 1.667-.746 1.667-1.666v-.417c0-.92-.746-1.667-1.667-1.667Z",
        ],
    },
    {
        file: "2-align-center-horizontally.tsx",
        name: "IconAlignCenterHorizontally",
        paths: [
            "M10 18.333v-2.916",
            "M10 11.667V8.333",
            "M10 4.583V1.667",
            "M4.792 13.125v.417c0 .92.746 1.666 1.666 1.666h7.084c.92 0 1.666-.746 1.666-1.666v-.417c0-.92-.746-1.667-1.666-1.667H6.458c-.92 0-1.666.746-1.666 1.667Z",
            "M6.458 6.458v.417c0 .92.747 1.667 1.667 1.667h3.75c.92 0 1.667-.747 1.667-1.667v-.417c0-.92-.746-1.666-1.667-1.666h-3.75c-.92 0-1.667.746-1.667 1.666Z",
        ],
    },
    {
        file: "3-align-right.tsx",
        name: "IconAlignRight",
        paths: [
            "M16.667 3.333v13.334",
            "M11.875 4.792H4.792c-.92 0-1.667.746-1.667 1.666v.417c0 .92.746 1.667 1.667 1.667h7.083c.92 0 1.667-.747 1.667-1.667v-.417c0-.92-.746-1.666-1.667-1.666Z",
            "M11.683 11.458H7.292c-.92 0-1.667.746-1.667 1.667v.417c0 .92.746 1.666 1.667 1.666h4.39c.921 0 1.667-.746 1.667-1.666v-.417c0-.92-.746-1.667-1.666-1.667Z",
        ],
    },
    {
        file: "4-distribute-horizontally.tsx",
        name: "IconDistributeHorizontally",
        paths: [
            "M16.667 3.333v13.334M3.333 3.333v13.334",
            "M14.375 10.208v-.416c0-.92-.746-1.667-1.667-1.667H7.292c-.92 0-1.667.746-1.667 1.667v.416c0 .92.746 1.667 1.667 1.667h5.416c.92 0 1.667-.746 1.667-1.667Z",
        ],
    },
    {
        file: "5-align-top.tsx",
        name: "IconAlignTop",
        paths: [
            "M3.333 3.333h13.334",
            "M13.542 6.458h-.417c-.92 0-1.667.747-1.667 1.667v7.083c0 .92.746 1.667 1.667 1.667h.417c.92 0 1.666-.746 1.666-1.667V8.125c0-.92-.746-1.667-1.666-1.667Z",
            "M6.875 6.458h-.417c-.92 0-1.666.747-1.666 1.667v3.75c0 .92.746 1.667 1.666 1.667h.417c.92 0 1.667-.746 1.667-1.667v-3.75c0-.92-.747-1.667-1.667-1.667Z",
        ],
    },
    {
        file: "6-align-center-vertically.tsx",
        name: "IconAlignCenterVertically",
        paths: [
            "M1.667 10h2.916",
            "M8.333 10h3.334",
            "M15.417 10h2.916",
            "M6.875 4.792h-.417c-.92 0-1.666.746-1.666 1.666v7.084c0 .92.746 1.666 1.666 1.666h.417c.92 0 1.667-.746 1.667-1.666V6.458c0-.92-.747-1.666-1.667-1.666Z",
            "M13.542 6.458h-.417c-.92 0-1.667.747-1.667 1.667v3.75c0 .92.746 1.667 1.667 1.667h.417c.92 0 1.666-.746 1.666-1.667v-3.75c0-.92-.746-1.667-1.666-1.667Z",
        ],
    },
    {
        file: "7-align-bottom.tsx",
        name: "IconAlignBottom",
        paths: [
            "M3.333 16.667h13.334",
            "M6.875 3.125h-.417c-.92 0-1.666.746-1.666 1.667v7.083c0 .92.746 1.667 1.666 1.667h.417c.92 0 1.667-.746 1.667-1.667V4.792c0-.92-.747-1.667-1.667-1.667Z",
            "M13.542 5.817h-.417c-.92 0-1.667.747-1.667 1.667v4.391c0 .92.746 1.667 1.667 1.667h.417c.92 0 1.666-.746 1.666-1.667V7.484c0-.92-.746-1.667-1.666-1.667Z",
        ],
    },
    {
        file: "8-distribute-vertically.tsx",
        name: "IconDistributeVertically",
        paths: [
            "M3.333 3.333h13.334M3.333 16.667h13.334",
            "M10.208 5.625h-.416c-.92 0-1.667.746-1.667 1.667v5.416c0 .92.746 1.667 1.667 1.667h.416c.92 0 1.667-.746 1.667-1.667V7.292c0-.92-.746-1.667-1.667-1.667Z",
        ],
    },
];

const dir = "c:/y/w/2-web/0-stack/2-editors/mermaid-rflow/src/ui/icons/normal/align";
fs.mkdirSync(dir, { recursive: true });

const header = `import { type HTMLAttributes } from "react";
import { classNames } from "@/utils";
`;

for (const icon of icons) {
    const paths = icon.paths
        .map((d) => `            <path d="${scalePath(d)}" />`)
        .join("\n");
    const src = `${header}
export function ${icon.name}({ className, title, ...rest }: HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current stroke-[1.5]", className)} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
${paths}
        </svg>
    );
}
`;
    fs.writeFileSync(`${dir}/${icon.file}`, src);
    console.log(icon.file);
}

const index = icons.map((icon) => `export * from "./${icon.file.replace(/\.tsx$/, "")}";`).join("\n") + "\n";
fs.writeFileSync(`${dir}/index.tsx`, index);
console.log("index.tsx");
