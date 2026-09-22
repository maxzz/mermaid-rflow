import { type HTMLAttributes } from "react";
import { classNames } from "@/utils";

export function IconAlignCenterHorizontally({ className, title, ...rest }: HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current stroke-[1.5]", className)} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <path d="M12 22v-3.5" />
            <path d="M12 14V10" />
            <path d="M12 5.5V2" />
            <path d="M5.75 15.75v0.5c0 1.104 0.895 2 2 2h8.5c1.104 0 2-0.895 2-2v-0.5c0-1.104-0.895-2-2-2H7.75c-1.104 0-2 0.895-2 2Z" />
            <path d="M7.75 7.75v0.5c0 1.104 0.896 2 2 2h4.5c1.104 0 2-0.896 2-2v-0.5c0-1.104-0.895-2-2-2h-4.5c-1.104 0-2 0.895-2 2Z" />
        </svg>
    );
}
