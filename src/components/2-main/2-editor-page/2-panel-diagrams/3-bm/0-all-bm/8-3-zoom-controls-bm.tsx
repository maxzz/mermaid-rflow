import { type ComponentProps, type RefObject } from "react";
import { atom, useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { HandIcon } from "lucide-react";

import { mermaidSettings, setZoom, zoomIn, zoomOut, ZOOM_MAX, ZOOM_MIN } from "@/store/2-mermaid-settings";
import { ZoomBar, ZoomBarToggle, zoomBarPositionClass } from "../../4-common/8-zoom-bar";

export function ZoomControls_Bm({ scrollRef, className, ...rest }: ComponentProps<'div'> & { scrollRef: RefObject<HTMLDivElement | null> }) {
    const { zoom } = useSnapshot(mermaidSettings);
    const [panMode, setPanMode] = useAtom(panModeAtom);

    function fitToView() {
        const container = scrollRef.current;
        const content = container?.querySelector<HTMLElement>(`[${PREVIEW_CONTENT_ATTR}]`);
        if (!container || !content) {
            setZoom(1);
            return;
        }

        // Content is scaled with CSS zoom; offsetWidth/Height report the unzoomed layout size
        // (unlike getBoundingClientRect, whose zoom handling differs between browser versions)
        const naturalW = content.offsetWidth;
        const naturalH = content.offsetHeight;
        if (naturalW <= 0 || naturalH <= 0) {
            setZoom(1);
            return;
        }

        const padding = 56; // scroll area p-6 (2 x 24px) + a small margin
        const fit = Math.min((container.clientWidth - padding) / naturalW, (container.clientHeight - padding) / naturalH);
        setZoom(fit);
    }

    return (
        <ZoomBar
            className={classNames(zoomBarPositionClass, className)}
            zoom={zoom}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            onZoomOut={zoomOut}
            onZoomIn={zoomIn}
            onResetZoom={() => setZoom(1)}
            onFit={fitToView}
            {...rest}
        >
            <ZoomBarToggle
                pressed={panMode}
                title={panMode ? "Pan mode on: drag to scroll" : "Pan mode: drag to scroll"}
                onClick={() => setPanMode((v) => !v)}
            >
                <HandIcon />
            </ZoomBarToggle>
        </ZoomBar>
    );
}

/** Pan mode: drag the preview to scroll. Transient UI state. */
export const panModeAtom = atom(false);

/** Marker attribute on the zoomed preview content, used by fit-to-view. */
export const PREVIEW_CONTENT_ATTR = 'data-preview-content';
