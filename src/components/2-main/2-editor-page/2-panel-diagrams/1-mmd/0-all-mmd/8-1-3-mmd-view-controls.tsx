import { type RefObject } from 'react';
import { useAtom } from 'jotai';
import { useSnapshot } from 'valtio';
import { HandIcon } from 'lucide-react';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '@/store/2-mermaid-settings';
import { ZoomBar, ZoomBarToggle, zoomBarPositionClass } from '../../4-common/8-zoom-bar';
import { mmdSettings } from '../8-store/2-mmd-settings';
import { mmdPanModeAtom, mmdZoomAtom } from '../8-store/3-mmd-ui';
import { fitMmdToView, setMmdZoom } from './8-3-mmd-zoom-utils';

export function MmdViewControls({
    viewportRef,
    contentRef,
}: {
    viewportRef: RefObject<HTMLDivElement | null>;
    contentRef: RefObject<HTMLDivElement | null>;
}) {
    const [zoom] = useAtom(mmdZoomAtom);
    const [panMode, setPanMode] = useAtom(mmdPanModeAtom);
    const { autofit } = useSnapshot(mmdSettings);

    function applyZoom(next: number) {
        mmdSettings.autofit = false;
        setMmdZoom(next, viewportRef.current);
    }

    return (
        <ZoomBar
            className={zoomBarPositionClass}
            data-mmd-chrome=""
            zoom={zoom}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            onZoomOut={() => applyZoom(zoom / ZOOM_STEP)}
            onZoomIn={() => applyZoom(zoom * ZOOM_STEP)}
            onResetZoom={() => applyZoom(1)}
            onFit={() => {
                mmdSettings.autofit = true;
                fitMmdToView(viewportRef.current, contentRef.current);
            }}
            fitActive={autofit}
        >
            <ZoomBarToggle
                pressed={panMode}
                title={panMode ? 'Pan tool on — click again to select, move, and connect blocks' : 'Pan the canvas. Leave this off to select and move blocks.'}
                onClick={() => setPanMode((v) => !v)}
            >
                <HandIcon />
            </ZoomBarToggle>
        </ZoomBar>
    );
}
