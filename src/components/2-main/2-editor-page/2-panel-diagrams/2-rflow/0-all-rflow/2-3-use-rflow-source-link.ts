import { useCallback, useLayoutEffect, useMemo, useRef, type MouseEvent } from 'react';
import { useSnapshot } from 'valtio';
import { type Edge, type Node, type ReactFlowInstance } from 'reactflow';
import { mermaidSettings } from '@/store/2-mermaid-settings';
import { type LinkIntensity, buildSourceIndex, clearSelection, clearSourceLink, selectFromDiagram, setSourceIndex, sourceLink } from '@/components/2-main/2-editor-page/2-panel-diagrams/3-bm/6-source-render-links';
import { catalogFlowGraph, catalogKeyForEdge, catalogKeyForNode, rfIdsForLinkKeys } from '../1-canvas/8-catalog-rflow';

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
        [edges, nodes, source]);

    useLayoutEffect(
        () => {
            if (!enabled) {
                return;
            }
            setSourceIndex(buildSourceIndex(source, catalogFlowGraph(nodes, edges)));
        },
        [enabled, topologyKey]);

    useLayoutEffect(
        () => {
            return () => {
                clearSourceLink();
            };
        },
        []);

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
        [enabled, intensity, keys, link.origin, nodes, reactFlow]);

    const classForNode = useCallback(
        (node: Node) => {
            if (link.origin === 'diagram') {
                return undefined;
            }
            return classForKey(catalogKeyForNode(node), keys, intensity, caretNodeClasses, clickNodeClasses);
        },
        [intensity, keys, link.origin]);

    const classForEdge = useCallback(
        (edge: Edge) => classForKey(catalogKeyForEdge(edge), keys, intensity, caretEdgeClasses, clickEdgeClasses),
        [intensity, keys]);

    const onNodeClick = useCallback(
        (_event: MouseEvent, node: Node) => {
            selectFromDiagram([catalogKeyForNode(node)]);
        },
        []);

    const onEdgeClick = useCallback(
        (_event: MouseEvent, edge: Edge) => {
            selectFromDiagram([catalogKeyForEdge(edge)]);
        },
        []);

    const onPaneClick = useCallback(
        () => {
            clearSelection();
        },
        []);

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

function classForKey(key: string, keys: string[], intensity: LinkIntensity, caretClass: string, clickClass: string): string | undefined {
    if (!keys.includes(key)) {
        return undefined;
    }
    return intensity === 'click' ? clickClass : caretClass;
}

const caretNodeClasses = 'outline-2 outline-solid outline-primary outline-offset-2';
const clickNodeClasses = 'outline-[3px] outline-solid outline-primary outline-offset-2 shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_40%,transparent)]!';
const caretEdgeClasses = '[&_path]:stroke-primary!';
const clickEdgeClasses = '[&_path]:stroke-primary! [&_path]:stroke-[3px]! [&_path]:drop-shadow-[0_0_4px_color-mix(in_oklab,var(--primary)_45%,transparent)]';
