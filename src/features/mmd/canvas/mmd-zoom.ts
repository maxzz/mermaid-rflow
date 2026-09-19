import { getDefaultStore } from 'jotai';
import { ZOOM_MAX, ZOOM_MIN } from '@/store/2-mermaid-settings';
import { mmdZoomAtom } from '../store/3-mmd-ui';

export function setMmdZoom(next: number) {
    getDefaultStore().set(mmdZoomAtom, Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next)));
}

export function fitMmdToView(container: HTMLElement | null, content: HTMLElement | null) {
    if (!container || !content) {
        setMmdZoom(1);
        return;
    }
    const svg = content.querySelector('svg');
    const naturalW = svg instanceof SVGSVGElement
        ? (svg.viewBox.baseVal.width || svg.width.baseVal.value || content.offsetWidth)
        : content.offsetWidth;
    const naturalH = svg instanceof SVGSVGElement
        ? (svg.viewBox.baseVal.height || svg.height.baseVal.value || content.offsetHeight)
        : content.offsetHeight;
    if (naturalW <= 0 || naturalH <= 0) {
        setMmdZoom(1);
        return;
    }
    const padding = 56;
    const fit = Math.min((container.clientWidth - padding) / naturalW, (container.clientHeight - padding) / naturalH);
    setMmdZoom(fit);
}
