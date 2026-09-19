import { type RefObject } from 'react';
import { useAtom } from 'jotai';
import { useSnapshot } from 'valtio';
import { HandIcon, MaximizeIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { classNames } from '@/utils';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '@/store/2-mermaid-settings';
import { Button } from '@/ui/shadcn/button';
import { mmdSettings } from '../store/2-mmd-settings';
import { mmdPanModeAtom, mmdZoomAtom } from '../store/3-mmd-ui';
import { fitMmdToView, setMmdZoom } from '../canvas/mmd-zoom';

export function MmdViewControls({
    scrollRef,
    contentRef,
}: {
    scrollRef: RefObject<HTMLDivElement | null>;
    contentRef: RefObject<HTMLDivElement | null>;
}) {
    const [zoom] = useAtom(mmdZoomAtom);
    const [panMode, setPanMode] = useAtom(mmdPanModeAtom);
    const { autofit } = useSnapshot(mmdSettings);

    return (
        <div
            data-mmd-chrome=""
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 p-1 bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-md flex flex-col gap-0.5"
            role="toolbar"
            aria-label="View controls"
        >
            <Button
                className={classNames(panMode && 'bg-muted text-foreground')}
                variant="ghost"
                size="icon-sm"
                onClick={() => setPanMode((v) => !v)}
                title={panMode ? 'Pan mode on: drag to scroll' : 'Pan mode: drag to scroll'}
                aria-pressed={panMode}
            >
                <HandIcon />
            </Button>
            <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                    mmdSettings.autofit = false;
                    setMmdZoom(zoom * ZOOM_STEP);
                }}
                disabled={zoom >= ZOOM_MAX}
                title="Zoom in"
            >
                <ZoomInIcon />
            </Button>
            <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                    mmdSettings.autofit = false;
                    setMmdZoom(zoom / ZOOM_STEP);
                }}
                disabled={zoom <= ZOOM_MIN}
                title="Zoom out"
            >
                <ZoomOutIcon />
            </Button>
            <Button
                variant="ghost"
                size="icon-sm"
                className="text-[0.6rem] font-medium"
                onClick={() => {
                    mmdSettings.autofit = false;
                    setMmdZoom(1);
                }}
                title="Reset zoom to 100%"
            >
                1:1
            </Button>
            <Button
                variant="ghost"
                size="icon-sm"
                title={autofit ? 'Fit (autofit on)' : 'Fit to view'}
                onClick={() => {
                    mmdSettings.autofit = true;
                    fitMmdToView(scrollRef.current, contentRef.current);
                }}
            >
                <MaximizeIcon />
            </Button>
        </div>
    );
}
