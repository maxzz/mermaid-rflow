import { startTransition, addTransitionType, useCallback } from 'react';
import { atom, useSetAtom } from 'jotai';
import { mermaidSettings } from './2-mermaid-settings';

/**
 * Transient UI state lives in Jotai (not Valtio) on purpose:
 * Valtio's useSnapshot is built on useSyncExternalStore, whose updates are always
 * synchronous and never join a startTransition, so a Valtio-driven page switch
 * would not animate with <ViewTransition>. Jotai hooks are transition-compatible.
 */

export type AppPage = 'welcome' | 'main';

export const pageAtom = atom<AppPage>(mermaidSettings.showWelcome ? 'welcome' : 'main');

export const TRANSITION_TYPE_TO_MAIN = 'nav-to-main';
export const TRANSITION_TYPE_TO_WELCOME = 'nav-to-welcome';

/** Navigate between pages inside a transition so <ViewTransition> boundaries animate. */
export function useNavigateToPage() {
    const setPage = useSetAtom(pageAtom);

    return useCallback(
        (page: AppPage) => {
            startTransition(
                () => {
                    addTransitionType(page === 'main' ? TRANSITION_TYPE_TO_MAIN : TRANSITION_TYPE_TO_WELCOME);
                    setPage(page);
                }
            );
        },
        [setPage]);
}
