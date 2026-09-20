import { getDefaultStore } from 'jotai';
import { ZOOM_MAX, ZOOM_MIN } from '@/store/2-mermaid-settings';
import { mmdZoomAtom } from '../store/3-mmd-ui';

export function setMmdZoom(next: number) {
    getDefaultStore().set(mmdZoomAtom, Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next)));
}

export function fitMmdToView(container: HTMLElement | null, content: HTMLElement | null) {
    if (!container || !content) {
        setMmdZoom(1);
        centerMmdScroll(container);
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
        centerMmdScroll(container);
        return;
    }
    const padding = 56;
    const fit = Math.min(
        (container.clientWidth - padding) / naturalW,
        (container.clientHeight - padding) / naturalH,
    );
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, fit));
    const prev = getDefaultStore().get(mmdZoomAtom);
    setMmdZoom(next);
    // Same zoom still needs a recenter when the canvas was scrolled away from the diagram.
    centerMmdScroll(container, Math.abs(prev - next) > 1e-6);
}

/** Center the diagram in the scroll viewport after fit / autofit. */
export function centerMmdScroll(container: HTMLElement | null, waitForLayout = false) {
    if (!container) {
        return;
    }

    const apply = () => {
        container.scrollLeft = Math.max(0, (container.scrollWidth - container.clientWidth) / 2);
        container.scrollTop = Math.max(0, (container.scrollHeight - container.clientHeight) / 2);
    };

    if (!waitForLayout) {
        apply();
        return;
    }
    // Wait for React to commit the new scale before measuring scrollWidth/Height.
    requestAnimationFrame(() => requestAnimationFrame(apply));
}
