import {describe, it, expect} from 'vitest';
import {flattenConnection} from './flatten-connection';

describe('flattenConnection', () => {
  it('flattens a nodes-based connection', () => {
    const result = flattenConnection({nodes: [{id: '1'}, {id: '2'}]});
    expect(result).toEqual([{id: '1'}, {id: '2'}]);
  });

  it('flattens an edges-based connection', () => {
    const result = flattenConnection({
      edges: [{node: {id: '1'}}, {node: {id: '2'}}],
    });
    expect(result).toEqual([{id: '1'}, {id: '2'}]);
  });

  it('returns empty array for undefined input', () => {
    const result = flattenConnection(undefined);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty nodes', () => {
    const result = flattenConnection({nodes: []});
    expect(result).toEqual([]);
  });
});
