import { toast } from 'sonner';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { captureMonacoView } from '@/components/2-main/2-editor-page/3-source-diagram-link/1-monaco/2-monaco-editor-handle';
import { mmdDiagram } from '../store/1-mmd-diagram';
import { type PatchResult } from './2-source-patch';

const SKIP_TOAST_ID = 'mmd-no-writeback';

export function applyMmdSourcePatch(next: string) {
    if (next === mermaidSettings.source) {
        return;
    }
    captureMonacoView();
    mmdDiagram.immediate = true;
    mermaidSettings.source = next;
}

export function applyMmdPatchResult(result: PatchResult): boolean {
    if (!result.ok) {
        if (result.reason === 'not-flowchart') {
            toast.warning('Canvas edits are not written back for this diagram type. Structural editing supports graph/flowchart.', {
                id: SKIP_TOAST_ID,
            });
        }
        return false;
    }
    if (result.changed) {
        applyMmdSourcePatch(result.source);
    }
    return true;
}
