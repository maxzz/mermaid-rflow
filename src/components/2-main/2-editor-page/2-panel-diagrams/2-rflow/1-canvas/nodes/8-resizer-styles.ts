import type { CSSProperties } from 'react';

/** Flow pixels that occupy `screenPx` on screen at the current zoom. */
export function screenPx(screenPx: number, zoom: number): number {
    return screenPx / (zoom > 0 ? zoom : 1);
}

/** Screen pixels at zoom 1. Flow space divides by zoom so the chrome stays this size on screen. */
const HANDLE = 12;
const HANDLE_BORDER = 2;
const HANDLE_RADIUS = 3;
const LINE = 2;

export function resizerStyles(zoom: number): { handle: CSSProperties; line: CSSProperties; } {
    const px = (n: number) => screenPx(n, zoom);
    return {
        handle: {
            backgroundColor: '#2563eb',
            border: `${px(HANDLE_BORDER)}px solid white`,
            width: px(HANDLE),
            height: px(HANDLE),
            borderRadius: px(HANDLE_RADIUS),
            boxShadow: `0 ${px(2)}px ${px(8)}px rgba(37, 99, 235, 0.3)`,
        },
        line: {
            borderColor: '#2563eb',
            borderWidth: px(LINE),
            opacity: 0.6,
        },
    };
}
