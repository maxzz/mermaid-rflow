/**
 * Helpers for exporting rendered diagrams: SVG/text/PNG download and clipboard.
 */

import { cssColorToSrgb } from './8-flatten-svg-colors';

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    try {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    } finally {
        // Defer revoke so the click has time to start the download
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

export function downloadText(text: string, filename: string, mime: string) {
    downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename);
}

export async function copyText(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
}

export async function copyPngBlob(blob: Blob): Promise<void> {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
        throw new Error('Image clipboard is not supported in this browser.');
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

/** Natural size of an SVG string (width/height attributes or viewBox). */
export function getSvgNaturalSize(svgText: string): { w: number; h: number; } {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = doc.documentElement;

    const w = parseFloat(svg.getAttribute('width') ?? '');
    const h = parseFloat(svg.getAttribute('height') ?? '');
    if (w > 0 && h > 0) {
        return { w, h };
    }

    const vb = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
        return { w: vb[2], h: vb[3] };
    }

    return { w: 800, h: 600 };
}

export type PngResult = { blob: Blob; width: number; height: number; };

/** Rasterize an SVG string to a PNG blob at the given scale. */
export async function svgToPngBlob(svgText: string, scale: number): Promise<PngResult> {
    const { w, h } = getSvgNaturalSize(svgText);

    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    try {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
        await img.decode();

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round((img.naturalWidth || w) * scale));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || h) * scale));

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas 2D context is not available.');
        }
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, img.naturalWidth || w, img.naturalHeight || h);

        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG encoding failed.')), 'image/png');
        });
        return { blob, width: canvas.width, height: canvas.height };
    } finally {
        URL.revokeObjectURL(url);
    }
}

/** Resolve a CSS custom property on :root to sRGB hex (oklch() is not portable in SVG files). */
export function resolveCssVar(name: string, fallback: string): string {
    if (typeof window === 'undefined') {
        return fallback;
    }
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const raw = value || fallback;
    try {
        return cssColorToSrgb(raw) || fallback;
    } catch {
        return raw;
    }
}
