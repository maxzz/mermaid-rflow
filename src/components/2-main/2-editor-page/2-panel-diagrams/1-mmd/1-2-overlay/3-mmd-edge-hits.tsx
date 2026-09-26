import { type PointerEvent as ReactPointerEvent } from 'react';
import { useAtomValue } from 'jotai';
import { selectFromDiagram } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { type MmdEdgeHit } from './8-mmd-layout-math';
import { mmdPanModeAtom } from '../8-store/3-mmd-ui-atoms';

export function MmdEdgeHits({ edges, selectedEdgeKey }: { edges: MmdEdgeHit[]; selectedEdgeKey: string | null; }) {
    const panMode = useAtomValue(mmdPanModeAtom);

    function onEdgePointerDown(e: ReactPointerEvent<SVGPolylineElement>, key: string) {
        if (e.button !== 0 || panMode) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        selectFromDiagram([key]);
    }

    return (
        <svg className="absolute inset-0 overflow-visible pointer-events-none z-4" width="100%" height="100%">
            {edges.map(
                (edge) => {
                    const selectedLine = edge.key === selectedEdgeKey;
                    return (
                        <g key={edge.key}>
                            <polyline
                                data-mmd-edge={edge.key}
                                className="hover:stroke-primary/45 cursor-pointer [pointer-events:stroke]"
                                points={pointsAttr(edge.points)}
                                fill="none"
                                stroke="transparent"
                                strokeWidth={14}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                pointerEvents={panMode ? 'none' : 'stroke'}
                                onPointerDown={(e) => onEdgePointerDown(e, edge.key)}
                            />
                            {selectedLine && (
                                <polyline
                                    className="mmd-edge-selected"
                                    points={pointsAttr(edge.points)}
                                    fill="none"
                                    stroke="var(--primary)"
                                    strokeWidth={3.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    pointerEvents="none"
                                />
                            )}
                        </g>
                    );
                }
            )}
        </svg>
    );
}

function pointsAttr(points: { x: number; y: number; }[]): string {
    return points.map((pt) => `${pt.x},${pt.y}`).join(' ');
}
