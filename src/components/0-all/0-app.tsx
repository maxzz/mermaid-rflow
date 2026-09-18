import { ViewTransition } from 'react';
import { useAtomValue } from 'jotai';
import { Toaster } from '@/ui/shadcn/sonner';
import { AllDialogs } from './1-globals';
import { pageAtom, TRANSITION_TYPE_TO_MAIN, TRANSITION_TYPE_TO_WELCOME } from '@/store/4-ui-atoms';
import { WelcomePage, EditorPage } from '../2-main';
import './2-view-transitions.css';

export function App() {
    const page = useAtomValue(pageAtom);

    return (<>
        <Toaster />
        <AllDialogs />

        {page === 'welcome'
            ? (
                <ViewTransition key="welcome" enter={welcomeEnter} exit={welcomeExit}>
                    <WelcomePage />
                </ViewTransition>
            )
            : (
                <ViewTransition key="main" enter={mainEnter} exit={mainExit}>
                    <EditorPage />
                </ViewTransition>
            )
        }
    </>);
}

// View Transition classes (see 2-view-transitions.css), selected by transition type set in useNavigateToPage()

const welcomeEnter = { [TRANSITION_TYPE_TO_WELCOME]: 'vt-page-enter-scale', default: 'vt-page-fade' };
const welcomeExit = { [TRANSITION_TYPE_TO_MAIN]: 'vt-page-exit-up', default: 'vt-page-fade' };

const mainEnter = { [TRANSITION_TYPE_TO_MAIN]: 'vt-page-enter-up', default: 'vt-page-fade' };
const mainExit = { [TRANSITION_TYPE_TO_WELCOME]: 'vt-page-exit-scale', default: 'vt-page-fade' };
