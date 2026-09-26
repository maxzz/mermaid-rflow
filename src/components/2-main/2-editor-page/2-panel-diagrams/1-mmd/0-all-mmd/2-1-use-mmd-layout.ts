import { type RefObject, useLayoutEffect } from 'react';
import { subscribe } from 'valtio';
import { applyMmdLayout, collectMmdNodeIds } from '../1-2-overlay/8-mmd-layout-math';
import { mmdLayout, pruneMmdLayout } from '../8-store/4-mmd-layout';

export type MmdLayoutArgs = {
    contentRef: RefObject<HTMLElement | null>;
    enabled: boolean;
    output: string;
};

export function useMmdLayout({ contentRef, enabled, output }: MmdLayoutArgs) {
    useLayoutEffect(
        () => {
            const root = contentRef.current;
            if (!enabled || !root) {
                return;
            }
            pruneMmdLayout(collectMmdNodeIds(root));
            applyMmdLayout(root, mmdLayout.nodes);
            return subscribe(mmdLayout, () => {
                const live = contentRef.current;
                if (live) {
                    applyMmdLayout(live, mmdLayout.nodes);
                }
            });
        },
        [contentRef, enabled, output],
    );
}
