import mermaid, { type MermaidConfig } from 'mermaid';
import { type MmdLook, type MmdTheme } from './1-themes';

export type OfficialRenderResult = {
    svg: string;
    diagramType: string | null;
    bindFunctions?: (element: Element) => void;
};

let renderSeq = 0;
let elkWarned = false;
let lastBindFunctions: ((element: Element) => void) | undefined;

export function bindLastMermaidFunctions(element: Element) {
    lastBindFunctions?.(element);
}

export function officialConfigSig(theme: MmdTheme, look: MmdLook): string {
    return `${theme}|${look}`;
}

export async function renderOfficialMermaid(source: string, theme: MmdTheme, look: MmdLook): Promise<OfficialRenderResult> {
    const text = source.trim();
    if (!text) {
        return { svg: '', diagramType: null };
    }

    const config: MermaidConfig = {
        startOnLoad: false,
        securityLevel: 'loose',
        theme,
        look,
        layout: 'dagre',
        flowchart: {
            htmlLabels: true,
            useMaxWidth: false,
            wrappingWidth: 200,
        },
    };

    mermaid.initialize(config);

    const parsed = await mermaid.parse(text);
    if (!parsed) {
        throw new Error('Invalid mermaid diagram');
    }
    const id = `mermaid-mmd-${++renderSeq}`;
    const { svg, bindFunctions } = await mermaid.render(id, text);

    if (text.includes('flowchart-elk') && !elkWarned) {
        elkWarned = true;
        console.info('Official Mermaid tab: ELK is not bundled with mermaid 11; flowchart-elk falls back to dagre.');
    }

    lastBindFunctions = bindFunctions;
    return {
        svg,
        diagramType: parsed.diagramType,
        bindFunctions,
    };
}

export function formatMermaidError(err: unknown): string {
    if (err && typeof err === 'object') {
        const rec = err as { str?: unknown; message?: unknown; };
        if (typeof rec.str === 'string' && rec.str.trim()) {
            return rec.str;
        }
        if (typeof rec.message === 'string' && rec.message.trim()) {
            return rec.message;
        }
    }
    if (err instanceof Error) {
        return err.message;
    }
    return String(err);
}
