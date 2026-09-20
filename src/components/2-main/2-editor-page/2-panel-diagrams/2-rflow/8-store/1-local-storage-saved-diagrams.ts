import { type Edge, type Node } from 'reactflow';
import { proxy, subscribe } from 'valtio';
import { debounceDevTools } from '@/utils/debounce';

const STORE_KEY = 'tm-mermaid-rflow-saved';
const STORE_VER = 'v1.0';
const STORAGE_ID = `${STORE_KEY}__${STORE_VER}`;

//---------------------------------------------------------------------------

export type SavedDiagram = {
    id: string;
    name: string;
    mermaid: string;
    nodes: Node[];
    edges: Edge[];
    createdAt: number;
    updatedAt: number;
};

export type RflowSavedState = {
    diagrams: SavedDiagram[];
};

//---------------------------------------------------------------------------

function loadSaved(): RflowSavedState {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<RflowSavedState>;
            if (Array.isArray(parsed.diagrams)) {
                return { diagrams: parsed.diagrams };
            }
        }
    } catch (e) {
        console.error('Failed to load saved React Flow diagrams', e);
    }
    return { diagrams: [] };
}

export const rflowSaved = proxy<RflowSavedState>(loadSaved());

subscribe(
    rflowSaved,
    debounceDevTools(
        () => {
            try {
                localStorage.setItem(STORAGE_ID, JSON.stringify(rflowSaved));
            } catch (e) {
                console.error('Failed to save React Flow diagrams', e);
            }
        },
        300,
    ),
);

//---------------------------------------------------------------------------
// Saved diagrams

export function addSavedDiagram(item: SavedDiagram) {
    rflowSaved.diagrams = [item, ...rflowSaved.diagrams];
}

export function removeSavedDiagram(id: string) {
    rflowSaved.diagrams = rflowSaved.diagrams.filter((d) => d.id !== id);
}

export function cloneGraphData<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

export function parseSavedDiagram(raw: unknown): SavedDiagram | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const o = raw as Partial<SavedDiagram>;
    if (!o.mermaid || !Array.isArray(o.nodes) || !Array.isArray(o.edges)) {
        return null;
    }
    const now = Date.now();
    return {
        id: o.id || `imported-${now}`,
        name: o.name || 'Imported diagram',
        mermaid: o.mermaid,
        nodes: o.nodes,
        edges: o.edges,
        createdAt: o.createdAt || now,
        updatedAt: o.updatedAt || now,
    };
}
