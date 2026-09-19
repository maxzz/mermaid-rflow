import { describe, expect, it } from 'vitest';
import { edgeEndpointsFromDomId, mermaidIdFromDomId } from './3-catalog-mmd';

describe('mermaidIdFromDomId', () => {
    it('strips the flowchart prefix and counter', () => {
        expect(mermaidIdFromDomId('flowchart-A-0')).toBe('A');
        expect(mermaidIdFromDomId('flowchart-us-east-12')).toBe('us-east');
        expect(mermaidIdFromDomId('flowchart-n1-3')).toBe('n1');
    });
});

describe('edgeEndpointsFromDomId', () => {
    it('parses underscore mermaid ids', () => {
        expect(edgeEndpointsFromDomId('L_A_B_0')).toEqual({ from: 'A', to: 'B' });
        expect(edgeEndpointsFromDomId('id_Start_End_2')).toEqual({ from: 'Start', to: 'End' });
    });

    it('uses known ids when the DOM id has hyphens', () => {
        expect(edgeEndpointsFromDomId('L-us-east-us-west-0', ['us-east', 'us-west'])).toEqual({
            from: 'us-east',
            to: 'us-west',
        });
    });
});
