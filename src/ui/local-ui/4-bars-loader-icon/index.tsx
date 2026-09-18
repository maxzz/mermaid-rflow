import { type ComponentProps } from "react";
import { classNames } from "@/utils";
import css from "./loader.module.css";

export function BarsLoaderIcon({ className, ...rest }: ComponentProps<'div'>) {
    return (
        <div className={classNames(css.loader, className)} {...rest} />
    );
}
