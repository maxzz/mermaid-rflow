import { proxy, subscribe } from 'valtio';
import { type ThemeMode, themeApplyMode } from '../utils/theme-apply';
import { type PanelSizes, getValidPanelSizes } from './8-panel-sizes';

const STORE_KEY = "tm-mermaid-rflow";
const STORE_VER = "v1.0";
const STORAGE_ID = `${STORE_KEY}__${STORE_VER}`;

export interface RflowCanvasSettings {
    showBgGrid: boolean;         // dotted background on the Rflow canvas
    showMinimap: boolean;        // React Rflow minimap
}

export interface AppSettings {
    theme: ThemeMode;            // Theme mode
    showFooter: boolean;         // Show footer in main layout
    panelSizes: PanelSizes;      // ResizablePanelGroup panel sizes (horizontal: editor | preview)
    rflow: RflowCanvasSettings;  // React Flow canvas chrome
}

const DEFAULT_RFLOW: RflowCanvasSettings = {
    showBgGrid: false,
    showMinimap: false,
};

const DEFAULT_SETTINGS: AppSettings = {
    theme: 'light',
    showFooter: true,
    panelSizes: getValidPanelSizes(),
    rflow: DEFAULT_RFLOW,
};

// Load settings from localStorage

function loadSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<AppSettings>;
            
            // merge stored settings with defaults to ensure new fields are present
            return {
                ...DEFAULT_SETTINGS,
                ...parsed,
                panelSizes: getValidPanelSizes(parsed.panelSizes),
                rflow: { ...DEFAULT_RFLOW, ...parsed.rflow },
            };
        }
    } catch (e) {
        console.error("Failed to load settings", e);
    }
    return { ...DEFAULT_SETTINGS };
}

//---------------------------------------------------------------------------

export const appSettings = proxy<AppSettings>(loadSettings());

themeApplyMode(appSettings.theme);

subscribe(appSettings, () => {
    try {
        themeApplyMode(appSettings.theme);
        localStorage.setItem(STORAGE_ID, JSON.stringify(appSettings));
    } catch (e) {
        console.error("Failed to save settings", e);
    }
});
