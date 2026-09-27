import { type ImgHTMLAttributes, ViewTransition } from "react";
import { classNames } from "@/utils";
import octopusLogo from "@/assets/icons/256w/octopus256.png";

/**
 * Temporary app logo. The same component is rendered on the Welcome page (large)
 * and in the editor header (small); the shared `name` makes React morph one into the other.
 */
export function AppLogo({ className, alt = "Mermaid Rflow logo", ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <ViewTransition name={APP_LOGO_VT_NAME} share="vt-logo-share">
            <img src={octopusLogo} alt={alt} className={classNames("object-contain", className)} {...rest} />
        </ViewTransition>
    );
}

export const APP_LOGO_VT_NAME = "mrf-app-logo";

export const APP_NAME = "Mermaid Labs";
