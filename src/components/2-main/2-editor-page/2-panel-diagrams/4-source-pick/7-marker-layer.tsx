import type { PlacedMarker } from './1-types';
import { sourcePickAppearId } from './4-settled-atoms';
import { NodeBadge } from './5-node-badge';
import { EdgeTag } from './6-edge-tag';

export function SourcePickLayer({ markers, selectionKey }: { markers: readonly PlacedMarker[]; selectionKey: string; }) {
    const appearId = sourcePickAppearId(selectionKey);
    if (!markers.length) {
        return null;
    }

    const edges = markers.filter((marker) => marker.kind === 'edge');
    const nodes = markers.filter((marker) => marker.kind === 'node');

    return (
        <div className="absolute inset-0 pointer-events-none z-30" aria-hidden>
            {edges.map((marker) => (
                <EdgeTag key={`${appearId}:${marker.id}`} marker={marker} />
            ))}
            {nodes.map((marker) => (
                <NodeBadge key={`${appearId}:${marker.id}`} marker={marker} settleKey={`${appearId}:${marker.id}`} />
            ))}
        </div>
    );
}
