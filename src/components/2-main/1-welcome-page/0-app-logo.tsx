import { type SVGAttributes, ViewTransition } from "react";
import { classNames } from "@/utils";

/**
 * Temporary app logo. The same component is rendered on the Welcome page (large)
 * and in the editor header (small); the shared `name` makes React morph one into the other.
 */
export function AppLogo({ className, ...rest }: SVGAttributes<SVGSVGElement>) {
    return (
        <ViewTransition name={APP_LOGO_VT_NAME} share="vt-logo-share">
            <svg className={classNames("fill-none stroke-current", className)} viewBox="0 0 64 64" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-label="Mermaid Rflow logo" {...rest}>
                <rect x="4" y="4" width="56" height="56" rx="14" className="fill-primary/10 stroke-primary" />

                {/* mini flowchart: one node on top, two below, connected */}
                <rect x="24" y="14" width="16" height="10" rx="3" className="stroke-primary" />
                <rect x="10" y="40" width="16" height="10" rx="3" className="stroke-primary" />
                <rect x="38" y="40" width="16" height="10" rx="3" className="stroke-primary" />

                <path d="M32 24v6c0 3-2 4-4 4h-6c-2 0-4 1-4 4v2" className="stroke-primary/70" />
                <path d="M32 24v6c0 3 2 4 4 4h6c2 0 4 1 4 4v2" className="stroke-primary/70" />
            </svg>
        </ViewTransition>
    );
}

export const APP_LOGO_VT_NAME = "mrf-app-logo";

export const APP_NAME = "Mermaid Rflow";
