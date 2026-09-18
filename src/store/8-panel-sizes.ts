import { type Layout } from 'react-resizable-panels';

export interface PanelSizes {
    horizontal: Layout;
    vertical: Layout;
}

export function getValidPanelSizes(parsedSizes?: unknown): PanelSizes {
    const defaultHorizontal = { left: 40, right: 60 }; // editor | preview
    const defaultVertical = { top: 50, bottom: 50 };

    const sizes = parsedSizes as PanelSizes | undefined;

    const rv: PanelSizes = {
        horizontal: sizes?.horizontal ?? defaultHorizontal,
        vertical: sizes?.vertical ?? defaultVertical,
    };

    return rv;
}
