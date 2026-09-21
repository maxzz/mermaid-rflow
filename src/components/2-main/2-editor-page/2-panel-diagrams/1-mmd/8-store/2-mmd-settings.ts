import { proxy, subscribe } from 'valtio';
import { debounceDevTools } from '@/utils/debounce';
import { type MmdLook, type MmdTheme } from '../1-render/1-themes';

const STORE_KEY = 'tm-mermaid-rflow-mmd';
const STORE_VER = 'v1.0';
const STORAGE_ID = `${STORE_KEY}__${STORE_VER}`;

export type MmdViewSettings = {
    theme: MmdTheme;
    adaptive: boolean;
    look: MmdLook;
    autofit: boolean;
};

const DEFAULT_SETTINGS: MmdViewSettings = {
    theme: 'redux-color',
    adaptive: true,
    look: 'classic',
    autofit: true,
};

function loadSettings(): MmdViewSettings {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<MmdViewSettings>;
            return { ...DEFAULT_SETTINGS, ...parsed };
        }
    } catch (e) {
        console.error('Failed to load official mermaid view settings', e);
    }
    return { ...DEFAULT_SETTINGS };
}

export const mmdSettings = proxy<MmdViewSettings>(loadSettings());

subscribe(
    mmdSettings,
    debounceDevTools(
        () => {
            try {
                localStorage.setItem(STORAGE_ID, JSON.stringify(mmdSettings));
            } catch (e) {
                console.error('Failed to save official mermaid view settings', e);
            }
        },
        300,
    ),
);
