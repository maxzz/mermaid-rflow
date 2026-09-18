/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isBeautifulMermaidBundle, patchBeautifulMermaidElkSource } from './patch-beautiful-mermaid-elk';

describe('patchBeautifulMermaidElkSource', () => {
    it('rewrites the published beautiful-mermaid bundle', () => {
        const code = readFileSync(fileURLToPath(import.meta.resolve('beautiful-mermaid')), 'utf8');
        const patched = patchBeautifulMermaidElkSource(code);

        expect(patched).toContain('opts.cycleBreakingStrategy ?? "GREEDY"');
        expect(patched).toContain('opts.nodePlacementStrategy ?? "BRANDES_KOEPF"');
        expect(patched).toContain('return elkToPositioned(result, graph, opts.mergeEdges);');
        expect(patched).not.toContain('return elkToPositioned(result, graph, DEFAULTS2.mergeEdges);');
        expect(patchBeautifulMermaidElkSource(patched)).toBe(patched);
    });

    it('recognizes the published bundle path', () => {
        expect(isBeautifulMermaidBundle('C:/x/node_modules/beautiful-mermaid/dist/index.js')).toBe(true);
        expect(isBeautifulMermaidBundle('C:/x/node_modules/beautiful-mermaid/src/index.ts')).toBe(false);
    });
});
