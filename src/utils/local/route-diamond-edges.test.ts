import { describe, expect, it } from 'vitest';
import {
    classifyOutgoingSides,
    detectGraphDirection,
    extractEdges,
    isBackEdge,
    routeDiamondEdges,
    routeIncoming,
    routeOutgoing,
    type NodeBox,
} from './route-diamond-edges';

const diamond: NodeBox = { id: 'B', shape: 'diamond', x: 100, y: 80, w: 80, h: 80 };
const start: NodeBox = { id: 'A', shape: 'rectangle', x: 110, y: 20, w: 60, h: 36 };
const ship: NodeBox = { id: 'C', shape: 'rectangle', x: 40, y: 220, w: 80, h: 36 };
const debug: NodeBox = { id: 'D', shape: 'rectangle', x: 180, y: 220, w: 80, h: 36 };

describe('detectGraphDirection', () => {
    it('reads graph / flowchart headers and skips frontmatter', () => {
        expect(detectGraphDirection('graph TD\nA-->B')).toBe('TD');
        expect(detectGraphDirection('flowchart LR\nA-->B')).toBe('LR');
        expect(detectGraphDirection('---\ntitle: x\n---\ngraph BT\nA-->B')).toBe('BT');
    });
});

describe('classifyOutgoingSides', () => {
    it('sends Yes left and No right on a TD diamond', () => {
        const nodes = new Map([['C', ship], ['D', debug]]);
        expect(classifyOutgoingSides(
            diamond,
            [
                { from: 'B', to: 'C', label: 'Yes', points: [] },
                { from: 'B', to: 'D', label: 'No', points: [] },
            ],
            nodes,
            'TD',
        )).toEqual(['w', 'e']);
    });
});

describe('routeOutgoing / routeIncoming', () => {
    it('starts Yes at the left vertex and No at the right', () => {
        const yes = routeOutgoing(diamond, ship, 'w', 'TD');
        const no = routeOutgoing(diamond, debug, 'e', 'TD');
        expect(yes[0]).toEqual({ x: 100, y: 120 });
        expect(no[0]).toEqual({ x: 180, y: 120 });
        expect(yes[0].x).not.toBe(no[0].x);
    });

    it('drops a forward edge on the top vertex and loops a back-edge to the top', () => {
        const forward = routeIncoming(start, diamond, 'TD');
        const loop = routeIncoming(debug, diamond, 'TD');
        expect(isBackEdge(debug, diamond, 'TD')).toBe(true);
        expect(forward[forward.length - 1]).toEqual({ x: 140, y: 80 });
        expect(loop[0]).toEqual({ x: 260, y: 238 });
        expect(loop[loop.length - 1]).toEqual({ x: 140, y: 80 });
        expect(loop[loop.length - 2].y).toBeLessThan(80);
    });
});

describe('routeDiamondEdges', () => {
    it('rewrites a bundled diamond stem into side exits and a top re-entry', () => {
        const svg = `<?xml version="1.0"?>
<svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
<polyline class="edge" data-from="A" data-to="B" data-style="solid" data-arrow-start="false" data-arrow-end="true" points="140,56 140,160" />
<polyline class="edge" data-from="B" data-to="C" data-style="solid" data-arrow-start="false" data-arrow-end="true" data-label="Yes" points="140,160 140,180 80,180 80,220" />
<polyline class="edge" data-from="B" data-to="D" data-style="solid" data-arrow-start="false" data-arrow-end="true" data-label="No" points="140,160 140,180 220,180 220,220" />
<polyline class="edge" data-from="D" data-to="B" data-style="solid" data-arrow-start="false" data-arrow-end="true" points="220,220 140,160" />
<g class="edge-label" data-from="B" data-to="C" data-label="Yes"><text>Yes</text></g>
<g class="node" data-id="A" data-label="Start" data-shape="rectangle">
  <rect x="110" y="20" width="60" height="36" />
</g>
<g class="node" data-id="B" data-label="Is it working?" data-shape="diamond">
  <polygon points="140,80 180,120 140,160 100,120" />
</g>
<g class="node" data-id="C" data-label="Ship it" data-shape="rectangle">
  <rect x="40" y="220" width="80" height="36" />
</g>
<g class="node" data-id="D" data-label="Debug" data-shape="rectangle">
  <rect x="180" y="220" width="80" height="36" />
</g>
</svg>`;

        const routed = routeDiamondEdges(svg, 'TD');
        const edges = extractEdges(routed);
        const yes = edges.find((e) => e.label === 'Yes')!;
        const no = edges.find((e) => e.label === 'No')!;
        const loop = edges.find((e) => e.from === 'D' && e.to === 'B')!;
        const startEdge = edges.find((e) => e.from === 'A' && e.to === 'B')!;

        expect(yes.points[0]).toEqual({ x: 100, y: 120 });
        expect(no.points[0]).toEqual({ x: 180, y: 120 });
        expect(yes.points[0]).not.toEqual(no.points[0]);
        expect(startEdge.points[startEdge.points.length - 1]).toEqual({ x: 140, y: 80 });
        expect(loop.points[loop.points.length - 1]).toEqual({ x: 140, y: 80 });
        expect(routed).toContain('transform="translate(');
    });
});
