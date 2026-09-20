import { useCallback, useLayoutEffect, useMemo, useRef, type MouseEvent } from 'react';
import { type Edge, type Node, type ReactFlowInstance } from 'reactflow';
import { useSnapshot } from 'valtio';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import {
    buildSourceIndex,
    clearSelection,
    clearSourceLink,
    selectFromDiagram,
    setSourceIndex,
    sourceLink,
    type LinkIntensity,
} from '@/store/6-source-render-links';
import { catalogFlowGraph, catalogKeyForEdge, catalogKeyForNode, rfIdsForLinkKeys } from './catalog-flow';

const CARET_CLASS = 'is-source-link-caret';
const CLICK_CLASS = 'is-source-link-click';

export function useFlowSourceLink(nodes: Node[], edges: Edge[], reactFlow: ReactFlowInstance, enabled = true) {
    const { source } = useSnapshot(mermaidSettings);
    const link = useSnapshot(sourceLink);
    const lastFitSig = useRef('');

    const topologyKey = useMemo(
        () =>
            [
                source,
                nodes.map((n) => `${n.id}:${catalogKeyForNode(n)}:${n.data?.label ?? ''}`).join('|'),
                edges.map((e) => `${e.id}:${catalogKeyForEdge(e)}`).join('|'),
            ].join('\0'),
        [edges, nodes, source],
    );

    useLayoutEffect(
        () => {
            if (!enabled) {
                return;
            }
            setSourceIndex(buildSourceIndex(source, catalogFlowGraph(nodes, edges)));
        },
        [enabled, topologyKey],
    );

    useLayoutEffect(
        () => {
            return () => {
                clearSourceLink();
            };
        },
        [],
    );

    const keys = link.keys as string[];
    const intensity = link.intensity;

    useLayoutEffect(
        () => {
            if (!enabled || link.origin !== 'editor' || intensity !== 'click' || !keys.length) {
                lastFitSig.current = '';
                return;
            }
            const sig = keys.join('|');
            if (sig === lastFitSig.current) {
                return;
            }
            lastFitSig.current = sig;
            const ids = rfIdsForLinkKeys(keys, nodes);
            if (!ids.length) {
                return;
            }
            reactFlow.fitView({ nodes: ids.map((id) => ({ id })), duration: 400, padding: 0.3 });
        },
        [enabled, intensity, keys, link.origin, nodes, reactFlow],
    );

    const classForNode = useCallback(
        (node: Node) => classForKey(catalogKeyForNode(node), keys, intensity),
        [intensity, keys],
    );

    const classForEdge = useCallback(
        (edge: Edge) => classForKey(catalogKeyForEdge(edge), keys, intensity),
        [intensity, keys],
    );

    const onNodeClick = useCallback(
        (_event: MouseEvent, node: Node) => {
            selectFromDiagram([catalogKeyForNode(node)]);
        },
        [],
    );

    const onEdgeClick = useCallback(
        (_event: MouseEvent, edge: Edge) => {
            selectFromDiagram([catalogKeyForEdge(edge)]);
        },
        [],
    );

    const onPaneClick = useCallback(
        () => {
            clearSelection();
        },
        [],
    );

    return {
        classForNode,
        classForEdge,
        onNodeClick,
        onEdgeClick,
        onPaneClick,
        keys,
        intensity,
    };
}

function classForKey(key: string, keys: string[], intensity: LinkIntensity): string | undefined {
    if (!keys.includes(key)) {
        return undefined;
    }
    return intensity === 'click' ? CLICK_CLASS : CARET_CLASS;
}
