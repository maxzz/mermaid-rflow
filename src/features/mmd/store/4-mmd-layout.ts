import { proxy, subscribe } from 'valtio';
import { debounceDevTools } from '@/utils/debounce';
import { type MmdNodePos } from '../catalog/5-mmd-layout';

const STORE_KEY = 'tm-mermaid-rflow-mmd-layout';
const STORE_VER = 'v1.0';
const STORAGE_ID = `${STORE_KEY}__${STORE_VER}`;

export type MmdLayoutState = {
    nodes: Record<string, MmdNodePos>;
};

function loadLayout(): MmdLayoutState {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<MmdLayoutState>;
            if (parsed.nodes && typeof parsed.nodes === 'object') {
                return { nodes: parsed.nodes };
            }
        }
    }
    catch (e) {
        console.error('Failed to load mermaid layout offsets', e);
    }
    return { nodes: {} };
}

export const mmdLayout = proxy<MmdLayoutState>(loadLayout());

subscribe(
    mmdLayout,
    debounceDevTools(
        () => {
            try {
                localStorage.setItem(STORAGE_ID, JSON.stringify({ nodes: mmdLayout.nodes }));
            }
            catch (e) {
                console.error('Failed to save mermaid layout offsets', e);
            }
        },
        300,
    ),
);

export function pruneMmdLayout(liveIds: Iterable<string>) {
    const keep = new Set(liveIds);
    for (const id of Object.keys(mmdLayout.nodes)) {
        if (!keep.has(id)) {
            delete mmdLayout.nodes[id];
        }
    }
}

export function setMmdNodePos(id: string, pos: MmdNodePos) {
    mmdLayout.nodes[id] = pos;
}
