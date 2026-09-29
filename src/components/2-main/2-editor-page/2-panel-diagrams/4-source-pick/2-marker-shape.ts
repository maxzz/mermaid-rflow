import type { MarkerShape } from './1-types';

/** One letter is a circle. Any longer name is a fully rounded rectangle. */
export function markerShape(name: string): MarkerShape {
    return /^\p{L}$/u.test(name.trim()) ? 'circle' : 'pill';
}

const ARROWS: Record<string, string> = {
    '->': '-->',
    '-->': '-->',
    '->>': '-->',
    '---': '---',
    '-.-': '-.->',
    '-.->': '-.->',
    '==>': '==>',
    '===>': '==>',
    '===': '==>',
};

/** Source-style connection text, e.g. `A --> B` or `B -->|Yes| C`. */
export function connectionCaption(from: string, to: string, op?: string, label?: string): string {
    const arrow = (op && ARROWS[op]) || op || '-->';
    const text = label?.trim() ?? '';
    if (!text) {
        return `${from} ${arrow} ${to}`;
    }
    return `${from} ${arrow}|${text}| ${to}`;
}
