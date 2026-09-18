/**
 * beautiful-mermaid 1.1.3 hardcodes ELK layered-layout knobs.
 * Rewrite the published bundle so mermaid-style options on RenderOptions
 * actually reach ELK (cycle breaking, node placement, model order, …).
 */

const REPLACEMENTS: ReadonlyArray<{ find: string; replace: string; }> = [
    {
        find: '"elk.layered.thoroughness": String(DEFAULTS2.thoroughness),',
        replace: '"elk.layered.thoroughness": String(opts.thoroughness ?? DEFAULTS2.thoroughness),',
    },
    {
        find: `"elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.wrapping.strategy": "OFF",`,
        replace: `"elk.layered.considerModelOrder.strategy": opts.considerModelOrder ?? "NODES_AND_EDGES",
      "elk.layered.nodePlacement.strategy": opts.nodePlacementStrategy ?? "BRANDES_KOEPF",
      "elk.layered.cycleBreaking.strategy": opts.cycleBreakingStrategy ?? "GREEDY",
      "elk.layered.crossingMinimization.forceNodeModelOrder": String(opts.forceNodeModelOrder ?? false),
      "elk.layered.mergeEdges": String(opts.mergeEdges ?? DEFAULTS2.mergeEdges),
      "elk.layered.wrapping.strategy": "OFF",`,
    },
    {
        find: `"elk.layered.spacing.nodeNodeBetweenLayers": String(opts.layerSpacing),
    "elk.spacing.nodeNode": String(opts.nodeSpacing)
  };
  if (sg.direction) {`,
        replace: `"elk.layered.spacing.nodeNodeBetweenLayers": String(opts.layerSpacing),
    "elk.spacing.nodeNode": String(opts.nodeSpacing),
    "elk.layered.thoroughness": String(opts.thoroughness ?? DEFAULTS2.thoroughness),
    "elk.layered.considerModelOrder.strategy": opts.considerModelOrder ?? "NODES_AND_EDGES",
    "elk.layered.nodePlacement.strategy": opts.nodePlacementStrategy ?? "BRANDES_KOEPF",
    "elk.layered.cycleBreaking.strategy": opts.cycleBreakingStrategy ?? "GREEDY",
    "elk.layered.crossingMinimization.forceNodeModelOrder": String(opts.forceNodeModelOrder ?? false),
    "elk.layered.mergeEdges": String(opts.mergeEdges ?? DEFAULTS2.mergeEdges)
  };
  if (sg.direction) {`,
    },
    {
        find: 'return elkToPositioned(result, graph, DEFAULTS2.mergeEdges);',
        replace: 'return elkToPositioned(result, graph, opts.mergeEdges);',
    },
];

export function isBeautifulMermaidBundle(id: string): boolean {
    const normalized = id.replaceAll('\\', '/');
    return normalized.includes('/beautiful-mermaid/') && normalized.endsWith('/dist/index.js');
}

export function patchBeautifulMermaidElkSource(code: string): string {
    if (code.includes('opts.cycleBreakingStrategy ??')) {
        return code;
    }

    let next = code;
    for (const { find, replace } of REPLACEMENTS) {
        if (!next.includes(find)) {
            throw new Error(`beautiful-mermaid ELK patch: marker not found:\n${find}`);
        }
        next = next.replace(find, replace);
    }
    return next;
}
