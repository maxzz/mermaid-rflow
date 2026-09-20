import { atom } from 'jotai';
import { type NodeShape } from '../catalog/1-flowchart-source';

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
export const mmdInlineEditAtom = atom<MmdInlineEdit | null>(null);
export const mmdConnectFromAtom = atom<string | null>(null);
export const mmdPaletteShapeAtom = atom<NodeShape>('rect');
