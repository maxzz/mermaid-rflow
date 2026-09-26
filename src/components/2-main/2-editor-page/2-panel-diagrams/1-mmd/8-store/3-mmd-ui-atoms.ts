import { atom } from 'jotai';
import { type NodeShape } from '../3-catalog/1-flowchart-source';
import { type AlignGuide } from '../3-catalog/7-drag-guides';
import { type MmdDragLinkPreview } from '../1-2-overlay/5-mmd-layout';

export type MmdInlineEdit = {
    id: string;
    text: string;
    x: number;
    y: number;
    w: number;
};

export type MmdPan = { x: number; y: number; };

export const mmdZoomAtom = atom(1);
export const mmdPanAtom = atom<MmdPan>({ x: 0, y: 0 });
export const mmdPanModeAtom = atom(false);
export const mmdNodeDraggingAtom = atom(false);

export type MmdDragOverlay = {
    links: MmdDragLinkPreview[];
    guides: AlignGuide[];
};

export const mmdDragOverlayAtom = atom<MmdDragOverlay | null>(null);
export const mmdInlineEditAtom = atom<MmdInlineEdit | null>(null);
export const mmdConnectFromAtom = atom<string | null>(null);
export const mmdPaletteShapeAtom = atom<NodeShape>('rect');
