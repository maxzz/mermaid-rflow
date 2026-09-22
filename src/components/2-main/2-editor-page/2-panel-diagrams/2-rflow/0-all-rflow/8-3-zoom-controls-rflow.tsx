import { useAtom } from 'jotai';
import { useReactFlow, useStore } from 'reactflow';
import { HandIcon } from 'lucide-react';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '@/store/2-mermaid-settings';
import { ZoomBar, ZoomBarToggle, zoomBarPositionClass } from '../../4-common/8-zoom-bar';
import { rflowPanModeAtom } from '../8-store/a-rflow-ui-atoms';

export function ZoomControls_Rflow() {
    const zoom = useStore((s) => s.transform[2]);
    const { zoomTo, fitView } = useReactFlow();
    const [panMode, setPanMode] = useAtom(rflowPanModeAtom);

    return (
        <ZoomBar
            className={zoomBarPositionClass}
            zoom={zoom}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            onZoomOut={() => zoomTo(zoom / ZOOM_STEP)}
            onZoomIn={() => zoomTo(zoom * ZOOM_STEP)}
            onResetZoom={() => zoomTo(1)}
            onFit={() => fitView({ padding: 0.2 })}
        >
            <ZoomBarToggle
                pressed={panMode}
                title={panMode ? 'Pan tool on — click again to select and move blocks' : 'Pan the canvas. Leave this off to select and move blocks.'}
                onClick={() => setPanMode((v) => !v)}
            >
                <HandIcon />
            </ZoomBarToggle>
        </ZoomBar>
    );
}
