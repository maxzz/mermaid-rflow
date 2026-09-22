import { type HTMLAttributes } from "react";
import { classNames } from "@/utils";

export function IconAlignTop({ className, title, ...rest }: HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current stroke-[1.5]", className)} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <path d="M4 4h16" />
            <path d="M16.25 7.75h-0.5c-1.104 0-2 0.896-2 2v8.5c0 1.104 0.895 2 2 2h0.5c1.104 0 2-0.895 2-2V9.75c0-1.104-0.895-2-2-2Z" />
            <path d="M8.25 7.75h-0.5c-1.104 0-2 0.896-2 2v4.5c0 1.104 0.895 2 2 2h0.5c1.104 0 2-0.895 2-2v-4.5c0-1.104-0.896-2-2-2Z" />
        </svg>
    );
}
