import { toast } from 'sonner';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { selectFromDiagram, sourceLink } from '@/store/6-source-render-links';
import { captureMonacoView } from '@/components/2-main/2-editor-page/3-source-diagram-link/1-monaco/2-monaco-editor-handle';
import { mmdDiagram } from '../store/1-mmd-diagram';
import { parseCatalogEdgeKey } from './3-catalog-mmd';
import { addNode, readEdgeStroke, readNodeStroke, setEdgeStroke, setNodeShape, setNodeStroke, type AddNodeOpts, type PatchResult } from './2-source-patch';
import { type ElementStroke } from './6-mmd-style';

const SKIP_TOAST_ID = 'mmd-no-writeback';

export function applyMmdSourcePatch(next: string) {
    if (next === mermaidSettings.source) {
        return;
    }
    const keepKeys = sourceLink.origin === 'diagram' ? [...sourceLink.keys] : null;
    captureMonacoView();
    mmdDiagram.immediate = true;
    mermaidSettings.source = next;
    if (keepKeys?.length) {
        selectFromDiagram(keepKeys);
    }
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

export function selectedMmdNodeId(): string | null {
    const selected = selectedMmdTarget();
    return selected?.kind === 'node' ? selected.id : null;
}

export type MmdSelection =
    | { kind: 'node'; id: string; }
    | { kind: 'edge'; from: string; to: string; label?: string; key: string; };

export function selectedMmdTarget(): MmdSelection | null {
    const preferEdge = sourceLink.keys[0]?.startsWith('edge:');
    let nodeId: string | null = null;
    let edge: MmdSelection | null = null;
    for (const key of sourceLink.keys) {
        if (!nodeId && key.startsWith('node:')) {
            nodeId = key.slice('node:'.length);
        }
        if (!edge && key.startsWith('edge:')) {
            const parsed = parseCatalogEdgeKey(key);
            if (parsed) {
                edge = { kind: 'edge', key, ...parsed };
            }
        }
    }
    if (preferEdge) {
        return edge;
    }
    if (nodeId) {
        return { kind: 'node', id: nodeId };
    }
    return edge;
}

export function applySelectedStroke(patch: Partial<ElementStroke>): boolean {
    const selected = selectedMmdTarget();
    if (!selected) {
        return false;
    }
    if (selected.kind === 'node') {
        return applyMmdPatchResult(setNodeStroke(mermaidSettings.source, selected.id, patch));
    }
    return applyMmdPatchResult(setEdgeStroke(mermaidSettings.source, selected.from, selected.to, patch, selected.label));
}

export function readSelectedStroke(): ElementStroke | null {
    const selected = selectedMmdTarget();
    if (!selected) {
        return null;
    }
    if (selected.kind === 'node') {
        return readNodeStroke(mermaidSettings.source, selected.id);
    }
    return readEdgeStroke(mermaidSettings.source, selected.from, selected.to, selected.label);
}

export function insertMmdPaletteNode(opts: AddNodeOpts): boolean {
    const selected = selectedMmdNodeId();
    if (selected) {
        return applyMmdPatchResult(setNodeShape(mermaidSettings.source, selected, opts.shape, opts));
    }
    return applyMmdPatchResult(addNode(mermaidSettings.source, opts));
}
