export const MMD_THEMES = [
    'default',
    'base',
    'dark',
    'forest',
    'neutral',
    'neo',
    'neo-dark',
    'redux',
    'redux-dark',
    'redux-color',
    'redux-dark-color',
] as const;

export type MmdTheme = (typeof MMD_THEMES)[number];
export type MmdLook = 'classic' | 'handDrawn' | 'neo';

export const MMD_LOOKS: { value: MmdLook; label: string; }[] = [
    { value: 'classic', label: 'Classic' },
    { value: 'handDrawn', label: 'Hand drawn' },
    { value: 'neo', label: 'Neo' },
];

export const MMD_THEME_LABELS: Record<MmdTheme, string> = {
    default: 'Default',
    base: 'Base',
    dark: 'Dark',
    forest: 'Forest',
    neutral: 'Neutral',
    neo: 'Neo',
    'neo-dark': 'Neo Dark',
    redux: 'Redux',
    'redux-dark': 'Redux Dark',
    'redux-color': 'Redux Color',
    'redux-dark-color': 'Redux Dark Color',
};

const THEME_PAIR: Record<MmdTheme, { light: MmdTheme; dark: MmdTheme; }> = {
    default: { light: 'default', dark: 'dark' },
    base: { light: 'base', dark: 'dark' },
    dark: { light: 'default', dark: 'dark' },
    forest: { light: 'forest', dark: 'dark' },
    neutral: { light: 'neutral', dark: 'dark' },
    neo: { light: 'neo', dark: 'neo-dark' },
    'neo-dark': { light: 'neo', dark: 'neo-dark' },
    redux: { light: 'redux', dark: 'redux-dark' },
    'redux-dark': { light: 'redux', dark: 'redux-dark' },
    'redux-color': { light: 'redux-color', dark: 'redux-dark-color' },
    'redux-dark-color': { light: 'redux-color', dark: 'redux-dark-color' },
};

export function resolveMmdTheme(theme: MmdTheme, adaptive: boolean, dark: boolean): MmdTheme {
    if (!adaptive) {
        return theme;
    }
    const pair = THEME_PAIR[theme] ?? THEME_PAIR.default;
    return dark ? pair.dark : pair.light;
}

export function mmdThemeFamily(theme: MmdTheme): MmdTheme {
    return THEME_PAIR[theme]?.light ?? theme;
}
