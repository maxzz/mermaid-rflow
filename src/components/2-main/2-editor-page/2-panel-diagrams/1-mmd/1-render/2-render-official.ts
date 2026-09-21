import mermaid, { type MermaidConfig } from 'mermaid';
import { type MmdLook, type MmdTheme } from './1-themes';
import { sourceWithResolvedLayout, type MmdLayout } from './2-render-layout';

export type { MmdLayout };
export { sourceWithResolvedLayout };

type OfficialRenderResult = {
    svg: string;
    diagramType: string | null;
    bindFunctions?: (element: Element) => void;
};

export async function renderOfficialMermaid(
    source: string,
    theme: MmdTheme,
    look: MmdLook,
    container: Element,
    layout: MmdLayout = 'elk',
): Promise<OfficialRenderResult> {
    const text = sourceWithResolvedLayout(source.trim(), layout);
    if (!text) {
        return { svg: '', diagramType: null };
    }

    // Register before initialize/parse. mermaid v11 silently falls back to Dagre
    // (curved edges) when `layout: elk` is requested but ELK is not registered.
    await ensureElkLayouts();

    const config: MermaidConfig = {
        startOnLoad: false,
        securityLevel: 'loose',
        theme,
        look,
        layout,
        // mermaid.ai `layout: fixed` is ELK's modelOrder preset: break the
        // Debug↔decision cycle at the later-declared back-edge so Start stays
        // on the first layer. GREEDY (ELK default) ranks the diamond first.
        elk: {
            cycleBreakingStrategy: 'GREEDY_MODEL_ORDER',
            considerModelOrder: 'NODES_AND_EDGES',
            nodePlacementStrategy: 'NETWORK_SIMPLEX',
            nodePlacementAlignment: 'NONE',
            keepEntryNodeOnTop: true,
        },
        flowchart: {
            htmlLabels: true,
            useMaxWidth: false,
            wrappingWidth: 200,
            // ELK orthogonal routes + rounded corners match mermaid.ai. Dagre's
            // `basis`/`rounded` interpolations are the bowed S-curves.
            curve: layout === 'elk' ? 'rounded' : 'linear',
        },
    };

    mermaid.initialize(config);

    const parsed = await mermaid.parse(text);
    if (!parsed) {
        throw new Error('Invalid mermaid diagram');
    }
    const id = `mermaid-mmd-${++renderSeq}`;
    const { svg, bindFunctions } = await mermaid.render(id, text, container);

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

let renderSeq = 0;
let lastBindFunctions: ((element: Element) => void) | undefined;

let elkLayoutsPromise: Promise<void> | undefined;

function ensureElkLayouts(): Promise<void> {
    elkLayoutsPromise ??= import('@mermaid-js/layout-elk').then(({ default: elkLayouts }) => {
        mermaid.registerLayoutLoaders(elkLayouts);
    });
    return elkLayoutsPromise;
}

export function bindLastMermaidFunctions(element: Element) {
    lastBindFunctions?.(element);
}

export function officialConfigSig(theme: MmdTheme, look: MmdLook, layout: MmdLayout): string {
    return `${theme}|${look}|${layout}|src-layout|model-order`;
}
