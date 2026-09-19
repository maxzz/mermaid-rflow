import { proxy, subscribe } from 'valtio';
import { debounceDevTools } from '@/utils/debounce';
import { type ThemeName } from 'beautiful-mermaid'; // `import type` only: must not pull the lazy chunk into the main bundle
import { DEFAULT_MERMAID_SOURCE } from '@/utils/local/mermaid-samples';

const STORE_KEY = "tm-mermaid-rflow-settings";
const STORE_VER = "v1.0";
const STORAGE_ID = `${STORE_KEY}__${STORE_VER}`;

export type OutputFormat = 'flow' | 'svg' | 'text';
export type BmOutputFormat = Exclude<OutputFormat, 'flow'>;
export type ExportFormat = BmOutputFormat | 'png';
export type DiagramTheme = 'auto' | ThemeName;
export type PngScale = 1 | 2 | 4;

export interface AsciiSettings {
    useAscii: boolean;      // true = pure ASCII, false = Unicode box drawing
    paddingX: number;       // horizontal spacing between nodes
    paddingY: number;       // vertical spacing between nodes
}

export const NODE_PLACEMENT_STRATEGIES = ['SIMPLE', 'NETWORK_SIMPLEX', 'LINEAR_SEGMENTS', 'BRANDES_KOEPF'] as const;
export type NodePlacementStrategy = typeof NODE_PLACEMENT_STRATEGIES[number];

export const CYCLE_BREAKING_STRATEGIES = ['GREEDY', 'DEPTH_FIRST', 'INTERACTIVE', 'MODEL_ORDER', 'GREEDY_MODEL_ORDER'] as const;
export type CycleBreakingStrategy = typeof CYCLE_BREAKING_STRATEGIES[number];

export const CONSIDER_MODEL_ORDERS = ['NONE', 'NODES_AND_EDGES', 'PREFER_EDGES', 'PREFER_NODES'] as const;
export type ConsiderModelOrder = typeof CONSIDER_MODEL_ORDERS[number];

/** Mermaid-compatible ELK knobs (see mermaid `config.elk`). */
export interface ElkLayoutSettings {
    mergeEdges: boolean;
    thoroughness: number;
    nodePlacementStrategy: NodePlacementStrategy;
    cycleBreakingStrategy: CycleBreakingStrategy;
    considerModelOrder: ConsiderModelOrder;
    forceNodeModelOrder: boolean;
}

export interface SvgLayoutSettings {
    padding: number;        // canvas padding in px
    nodeSpacing: number;    // horizontal spacing between sibling nodes
    layerSpacing: number;   // vertical spacing between layers
    font: string;           // font family for diagram text
    elk: ElkLayoutSettings; // SVG layout engine (ELK)
}

export interface MermaidSettings {
    showWelcome: boolean;       // show the welcome page at startup
    source: string;             // mermaid diagram source
    outputFormat: OutputFormat; // preview output format
    zoom: number;               // preview zoom factor
    diagramTheme: DiagramTheme; // 'auto' follows app light/dark mode
    ascii: AsciiSettings;
    svg: SvgLayoutSettings;
    pngScale: PngScale;         // PNG export scale
    exportFlattenColors: boolean;       // bake CSS vars / color-mix / oklch to hex
    exportIncludeFontImport: boolean;   // keep Google Fonts @import in SVG markup
}

/** Mermaid's ELK defaults, except mergeEdges (beautiful-mermaid bundles fan-in/out). */
export const DEFAULT_ELK_LAYOUT: ElkLayoutSettings = {
    mergeEdges: true,
    thoroughness: 3,
    nodePlacementStrategy: 'BRANDES_KOEPF',
    cycleBreakingStrategy: 'GREEDY_MODEL_ORDER',
    considerModelOrder: 'NODES_AND_EDGES',
    forceNodeModelOrder: false,
};

export const DIAGRAM_FONTS = [
    { value: 'Geist Variable', label: 'Geist' },
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto Condensed Variable', label: 'Roboto Condensed' },
    { value: 'Yanone Kaffeesatz Variable', label: 'Yanone Kaffeesatz' },
    { value: 'Geist Mono Variable', label: 'Geist Mono' },
] as const;

const DEFAULT_SETTINGS: MermaidSettings = {
    showWelcome: true,
    source: DEFAULT_MERMAID_SOURCE,
    outputFormat: 'flow',
    zoom: 1,
    diagramTheme: 'auto',
    ascii: {
        useAscii: false,
        paddingX: 5,
        paddingY: 5,
    },
    svg: {
        padding: 40,
        nodeSpacing: 24,
        layerSpacing: 40,
        font: DIAGRAM_FONTS[0].value,
        elk: { ...DEFAULT_ELK_LAYOUT },
    },
    pngScale: 2,
    exportFlattenColors: true,
    exportIncludeFontImport: false,
};

function loadSettings(): MermaidSettings {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<MermaidSettings>;

            // merge stored settings with defaults to ensure new fields are present
            return {
                ...DEFAULT_SETTINGS,
                ...parsed,
                ascii: { ...DEFAULT_SETTINGS.ascii, ...parsed.ascii },
                svg: {
                    ...DEFAULT_SETTINGS.svg,
                    ...parsed.svg,
                    elk: { ...DEFAULT_SETTINGS.svg.elk, ...parsed.svg?.elk },
                },
            };
        }
    } catch (e) {
        console.error("Failed to load mermaid settings", e);
    }
    return structuredClone(DEFAULT_SETTINGS);
}

export const mermaidSettings = proxy<MermaidSettings>(loadSettings());

const saveSettings = debounceDevTools(
    () => {
        try {
            localStorage.setItem(STORAGE_ID, JSON.stringify(mermaidSettings));
        } catch (e) {
            console.error("Failed to save mermaid settings", e);
        }
    },
    300, // source changes on every keystroke; coalesce writes
);

subscribe(mermaidSettings, saveSettings);

// Zoom helpers

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 8;
export const ZOOM_STEP = 1.25;

export function setZoom(zoom: number) {
    mermaidSettings.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
}

export function zoomIn() {
    setZoom(mermaidSettings.zoom * ZOOM_STEP);
}

export function zoomOut() {
    setZoom(mermaidSettings.zoom / ZOOM_STEP);
}

export function zoomReset() {
    setZoom(1);
}

export function resetSvgElkLayout() {
    mermaidSettings.svg.elk = { ...DEFAULT_ELK_LAYOUT };
}
