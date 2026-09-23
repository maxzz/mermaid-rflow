import { useSnapshot } from 'valtio';
import { type MarkingRectState } from './2-store';
import './3-marking-rect.css';

/** Overlay for a drag selection. Position it inside the same box the drag coordinates use. */
export function MarkingRect({ rect }: { rect: MarkingRectState; }) {
    const box = useSnapshot(rect);
    if (!box.active) {
        return null;
    }

    return (
        <div
            className="absolute marking-rect pointer-events-none z-10"
            style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
            aria-hidden
        />
    );
}
