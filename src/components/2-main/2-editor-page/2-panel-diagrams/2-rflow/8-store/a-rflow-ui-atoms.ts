import { atom } from 'jotai';
import { type Edge, type Node } from 'reactflow';
import { DEFAULT_COLORS } from '../2-converter/constants';

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

export const rf_SelectedNodesAtom = atom<Node[]>([]);
export const rf_SelectedEdgesAtom = atom<Edge[]>([]);
export const rf_SelectedEdgeIdAtom = atom<string | null>(null);
export const rf_PanModeAtom = atom(false);
export const rf_SearchOpenAtom = atom(false);
export const rf_LoadDialogOpenAtom = atom(false);
export const rf_ExportingAtom = atom(false);
export const rf_DraggingAtom = atom(false);
export const rf_EdgeLabelEditorAtom = atom<EdgeLabelEditorState | null>(null);
export const rf_NodeEditorDraftAtom = atom<NodeEditorDraft | null>(null);

//---------------------------------------------------------------------------
// Canvas methods

export type RflowCanvasMethods = {
    exportImage?: () => Promise<void>;
    openSearch?: () => void;
    selectSubgraphContents?: (id?: string) => void;
    fitView?: () => void;
};

export const rf_CanvasMethodsAtom = atom<RflowCanvasMethods>({});

//---------------------------------------------------------------------------

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

//---------------------------------------------------------------------------
// Icon search

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

export function defaultIconSearchState(): IconSearchState {
    return ({
        query: '',
        results: [],
        loading: false,
        loadingMore: false,
        error: '',
        isExpanded: false,
        hasMore: true,
        offset: 0,
    });
}

export const rf_IconSearchAtom = atom<IconSearchState>(defaultIconSearchState());

//---------------------------------------------------------------------------
// Load dialog

export type LoadDialogUi = {
    selectedId: string | null;
    imported: import('./1-local-storage-saved-diagrams').SavedDiagram | null;
    confirmDeleteId: string | null;
};

export function defaultLoadDialogUi(): LoadDialogUi {
    return ({
        selectedId: null,
        imported: null,
        confirmDeleteId: null,
    });
}

export const rf_LoadUiAtom = atom<LoadDialogUi>(defaultLoadDialogUi());
export const rf_LoadPreviewAtom = atom('');
