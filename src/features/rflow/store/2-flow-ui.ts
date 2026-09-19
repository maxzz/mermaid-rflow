import { atom } from 'jotai';
import { type Edge, type Node } from 'reactflow';
import { DEFAULT_COLORS } from '../converter/constants';

export type EdgeLabelEditorState = {
    edgeId: string;
    text: string;
    x: number;
    y: number;
};

export type NodeEditorDraft = {
    nodeId: string;
    nodeType: string | undefined;
    label: string;
    imageUrl: string;
    description: string;
    backgroundColor: string;
    borderColor: string;
    iconColor: string;
    imageValid: boolean | null;
};

export const rflowSelectedNodesAtom = atom<Node[]>([]);
export const rflowSelectedEdgesAtom = atom<Edge[]>([]);
export const rflowSelectedEdgeIdAtom = atom<string | null>(null);
export const rflowSearchOpenAtom = atom(false);
export const rflowLoadDialogOpenAtom = atom(false);
export const rflowExportingAtom = atom(false);
export const rflowDraggingAtom = atom(false);
export const rflowEdgeLabelEditorAtom = atom<EdgeLabelEditorState | null>(null);
export const rflowNodeEditorDraftAtom = atom<NodeEditorDraft | null>(null);

export type RflowCanvasMethods = {
    exportImage?: () => Promise<void>;
    openSearch?: () => void;
    selectSubgraphContents?: (id?: string) => void;
    fitView?: () => void;
};

export const rflowCanvasMethodsAtom = atom<RflowCanvasMethods>({});

export function draftFromNode(node: Node): NodeEditorDraft {
    return {
        nodeId: node.id,
        nodeType: node.type,
        label: String(node.data?.label ?? ''),
        imageUrl: String(node.data?.imageUrl ?? ''),
        description: String(node.data?.description ?? ''),
        backgroundColor: String(node.data?.style?.backgroundColor || node.style?.backgroundColor || DEFAULT_COLORS.background),
        borderColor: String(node.data?.style?.borderColor || node.style?.borderColor || DEFAULT_COLORS.border),
        iconColor: String(node.data?.style?.iconColor || node.data?.iconColor || DEFAULT_COLORS.icon),
        imageValid: null,
    };
}

export type IconSearchState = {
    query: string;
    results: { provider: string; prefix: string; name: string; }[];
    loading: boolean;
    loadingMore: boolean;
    error: string;
    isExpanded: boolean;
    hasMore: boolean;
    offset: number;
};

export const defaultIconSearchState = (): IconSearchState => ({
    query: '',
    results: [],
    loading: false,
    loadingMore: false,
    error: '',
    isExpanded: false,
    hasMore: true,
    offset: 0,
});

export const rflowIconSearchAtom = atom<IconSearchState>(defaultIconSearchState());

export type LoadDialogUi = {
    selectedId: string | null;
    imported: import('../storage/saved-diagrams').SavedDiagram | null;
    confirmDeleteId: string | null;
};

export const defaultLoadDialogUi = (): LoadDialogUi => ({
    selectedId: null,
    imported: null,
    confirmDeleteId: null,
});

export const rflowLoadUiAtom = atom<LoadDialogUi>(defaultLoadDialogUi());
export const rflowLoadPreviewAtom = atom('');
