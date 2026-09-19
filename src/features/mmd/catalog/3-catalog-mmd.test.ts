import { describe, expect, it } from 'vitest';
import { edgeEndpointsFromDomId, mermaidIdFromDomId } from './3-catalog-mmd';

describe('mermaidIdFromDomId', () => {
    it('strips the flowchart prefix and counter', () => {
        expect(mermaidIdFromDomId('flowchart-A-0')).toBe('A');
        expect(mermaidIdFromDomId('flowchart-us-east-12')).toBe('us-east');
        expect(mermaidIdFromDomId('flowchart-n1-3')).toBe('n1');
    });

    it('strips mermaid.render() id prefixes', () => {
        expect(mermaidIdFromDomId('mermaid-mmd-1-flowchart-A-0')).toBe('A');
        expect(mermaidIdFromDomId('mermaid-mmd-12-flowchart-us-east-3')).toBe('us-east');
        expect(mermaidIdFromDomId('mermaid-mmd-1')).toBeNull();
    });
});

describe('edgeEndpointsFromDomId', () => {
    it('parses underscore mermaid ids', () => {
        expect(edgeEndpointsFromDomId('L_A_B_0')).toEqual({ from: 'A', to: 'B' });
        expect(edgeEndpointsFromDomId('id_Start_End_2')).toEqual({ from: 'Start', to: 'End' });
        expect(edgeEndpointsFromDomId('mermaid-mmd-1-L_A_B_0')).toEqual({ from: 'A', to: 'B' });
    });

    it('uses known ids when the DOM id has hyphens', () => {
        expect(edgeEndpointsFromDomId('L-us-east-us-west-0', ['us-east', 'us-west'])).toEqual({
            from: 'us-east',
            to: 'us-west',
        });
    });
});
