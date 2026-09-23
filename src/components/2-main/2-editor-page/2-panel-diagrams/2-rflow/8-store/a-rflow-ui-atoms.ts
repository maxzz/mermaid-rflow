import { atom } from 'jotai';
import { type Edge, type Node } from 'reactflow';
import { DEFAULT_COLORS, type AlignmentType, type DistributionType } from '../2-converter/constants';
import { alignNodes, distributeNodes } from '../1-canvas/8-diagram-editing-utils';
import { rf_Diagram, setRflowNodes } from './0-flow-diagram';
import { syncMermaidFromGraph } from './1-sync-with-source';
import { resetIconSearchQuery } from './a-rflow-icon-search-atoms';

export const rf_SelectedNodesAtom = atom<Node[]>([]);
export const rf_SelectedEdgesAtom = atom<Edge[]>([]);
export const rf_PanModeAtom = atom(false);
export const rf_DraggingAtom = atom(false);
export const rf_ExportingAtom = atom(false);

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
// Arrange selected nodes

const rf_CommitNodesAtom = atom(null, (_get, set, next: Node[]) => {
    setRflowNodes(next);
    set(rf_SelectedNodesAtom, next.filter((node) => node.selected));
});

export const rf_AlignNodesAtom = atom(null, (get, set, alignment: AlignmentType) => {
    const next = alignNodes(rf_Diagram.nodes as Node[], get(rf_SelectedNodesAtom), alignment);
    set(rf_CommitNodesAtom, next);
});

export const rf_DistributeNodesAtom = atom(null, (get, set, direction: DistributionType) => {
    const next = distributeNodes(rf_Diagram.nodes as Node[], get(rf_SelectedNodesAtom), direction);
    set(rf_CommitNodesAtom, next);
});

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
// Save node editor dialog

export const doRflowSaveNodeEditorAtom = atom(null,
    (get, set) => {
        const draft = get(rf_NodeEditorDraftAtom);
        if (!draft) {
            return;
        }

        setRflowNodes(
            (rf_Diagram.nodes as Node[]).map(
                (node) => (
                    node.id === draft.nodeId
                        ? {
                            ...node,
                            data: {
                                ...node.data,
                                label: draft.label,
                                imageUrl: draft.imageUrl,
                                description: draft.description,
                                style: {
                                    ...(node.data?.style || {}),
                                    backgroundColor: draft.backgroundColor,
                                    borderColor: draft.borderColor,
                                    iconColor: draft.iconColor,
                                    border: `2px solid ${draft.borderColor}`,
                                },
                            },
                        }
                        : node
                )
            )
        );

        syncMermaidFromGraph();
        set(rf_NodeEditorDraftAtom, null);
        resetIconSearchQuery();
    }
);

//---------------------------------------------------------------------------
// Load dialog

export type LoadDialogUiData = {
    selectedId: string | null;
    imported: import('./8-local-storage-saved-diagrams').SavedDiagram | null;
    confirmDeleteId: string | null;
};

export function defaultLoadDialogUiData(): LoadDialogUiData {
    return ({
        selectedId: null,
        imported: null,
        confirmDeleteId: null,
    });
}

export const rf_LoadDialogUiDataAtom = atom<LoadDialogUiData>(defaultLoadDialogUiData());
export const rf_LoadDialogPreviewAtom = atom('');

//---------------------------------------------------------------------------
// Node editor dialog

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

export const rf_NodeEditorDraftAtom = atom<NodeEditorDraft | null>(null);

//---------------------------------------------------------------------------
// Edge label editor dialog

export type EdgeLabelEditorState = {
    edgeId: string;
    text: string;
    x: number;
    y: number;
};

export const rf_EdgeLabelEditorAtom = atom<EdgeLabelEditorState | null>(null);

//---------------------------------------------------------------------------
// Search dialog

export const rf_SearchDialogOpenAtom = atom(false);

//---------------------------------------------------------------------------
// Load dialog

export const rf_LoadDialogOpenAtom = atom(false);
