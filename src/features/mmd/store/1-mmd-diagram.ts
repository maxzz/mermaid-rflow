import { proxy } from 'valtio';

export type MmdDiagramState = {
    svg: string;
    error: string | null;
    ms: number;
    rendering: boolean;
    diagramType: string | null;
    lastRenderedSource: string;
    lastConfigSig: string;
    /** Skip the source debounce for the next converter pass (canvas-originated patches). */
    immediate: boolean;
};

export const mmdDiagram = proxy<MmdDiagramState>({
    svg: '',
    error: null,
    ms: 0,
    rendering: false,
    diagramType: null,
    lastRenderedSource: '',
    lastConfigSig: '',
    immediate: false,
});

export function resetMmdDiagram() {
    mmdDiagram.svg = '';
    mmdDiagram.error = null;
    mmdDiagram.ms = 0;
    mmdDiagram.rendering = false;
    mmdDiagram.diagramType = null;
    mmdDiagram.lastRenderedSource = '';
    mmdDiagram.lastConfigSig = '';
    mmdDiagram.immediate = false;
}
