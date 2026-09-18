import { type ComponentProps, useEffect, useRef, useState } from "react";
import { SelectItem } from "@/ui/shadcn/select";

const PREVIEW_VALUE_ATTR = "data-preview-value";

/**
 * Highlighted options live-preview in the diagram; click/Enter commits;
 * closing without a selection (Escape) restores the value from before open.
 */
export function useSelectPreview<T extends string>(live: T, apply: (value: T) => void) {
    const originRef = useRef(live);
    const didCommitRef = useRef(false);
    const liveRef = useRef(live);
    const applyRef = useRef(apply);
    const [open, setOpen] = useState(false);

    liveRef.current = live;
    applyRef.current = apply;

    function preview(value: string) {
        if (value !== liveRef.current) {
            applyRef.current(value as T);
        }
    }

    useEffect(
        () => {
            if (!open) {
                return;
            }

            function previewValue(value: string | null | undefined) {
                if (value) {
                    preview(value);
                }
            }

            function previewFromActive() {
                const el = document.activeElement as HTMLElement | null;
                previewValue(el?.getAttribute(PREVIEW_VALUE_ATTR) ?? el?.closest(`[${PREVIEW_VALUE_ATTR}]`)?.getAttribute(PREVIEW_VALUE_ATTR));
            }

            function onKeyDown(event: KeyboardEvent) {
                const items = [...document.querySelectorAll(`[${PREVIEW_VALUE_ATTR}]:not([data-disabled])`)];
                if (items.length === 0) {
                    return;
                }

                const index = items.indexOf(document.activeElement as Element);
                let nextIndex = index;

                if (event.key === "Home") {
                    nextIndex = 0;
                } else if (event.key === "End") {
                    nextIndex = items.length - 1;
                } else if (event.key === "ArrowDown") {
                    nextIndex = Math.min(index + 1, items.length - 1);
                } else if (event.key === "ArrowUp") {
                    nextIndex = Math.max((index < 0 ? items.length : index) - 1, 0);
                } else {
                    return;
                }

                previewValue(items[nextIndex]?.getAttribute(PREVIEW_VALUE_ATTR));
            }

            const controller = new AbortController();
            document.addEventListener("focusin", previewFromActive, { signal: controller.signal });
            document.addEventListener("keydown", onKeyDown, { signal: controller.signal });
            return () => {
                controller.abort();
            };
        },
        [open]);

    function onOpenChange(next: boolean) {
        if (next) {
            originRef.current = liveRef.current;
            didCommitRef.current = false;
        } else if (!didCommitRef.current) {
            applyRef.current(originRef.current);
        }
        setOpen(next);
    }

    function onValueChange(value: string) {
        didCommitRef.current = true;
        applyRef.current(value as T);
    }

    return {
        open,
        listValue: open ? originRef.current : live,
        onOpenChange,
        onValueChange,
        preview,
    };
}

export function PreviewSelectItem({ value, onPreview, ...rest }: ComponentProps<typeof SelectItem> & { onPreview: (value: string) => void; }) {
    return (
        <SelectItem
            {...rest}
            value={value}
            data-preview-value={value}
            onFocus={() => onPreview(value)}
            onPointerMove={() => onPreview(value)}
        />
    );
}
