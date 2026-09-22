import { type HTMLAttributes } from "react";
import { classNames } from "@/utils";

export function IconAlignRight({ className, title, ...rest }: HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current stroke-[1.5]", className)} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <path d="M20 4v16" />
            <path d="M14.25 5.75H5.75c-1.104 0-2 0.895-2 2v0.5c0 1.104 0.895 2 2 2h8.5c1.104 0 2-0.896 2-2v-0.5c0-1.104-0.895-2-2-2Z" />
            <path d="M14.02 13.75H8.75c-1.104 0-2 0.895-2 2v0.5c0 1.104 0.895 2 2 2h5.268c1.105 0 2-0.895 2-2v-0.5c0-1.104-0.895-2-2-2Z" />
        </svg>
    );
}
