import {describe, it, expect} from 'vitest';
import {
  parseFiltersFromParams,
  applyFilter,
  removeFilter,
} from './product-filters';

describe('parseFiltersFromParams', () => {
  it('returns an empty array when no filter params exist', () => {
    const params = new URLSearchParams('q=shirt');
    expect(parseFiltersFromParams(params)).toEqual([]);
  });

  it('parses a single variantOption filter', () => {
    const params = new URLSearchParams(
      'filter.variantOption={"name":"Color","value":"Red"}',
    );
    expect(parseFiltersFromParams(params)).toEqual([
      {variantOption: {name: 'Color', value: 'Red'}},
    ]);
  });

  it('parses a price range filter', () => {
    const params = new URLSearchParams('filter.price={"min":25,"max":100}');
    expect(parseFiltersFromParams(params)).toEqual([
      {price: {min: 25, max: 100}},
    ]);
  });

  it('parses multiple filters', () => {
    const params = new URLSearchParams([
      ['filter.variantOption', '{"name":"Color","value":"Red"}'],
      ['filter.variantOption', '{"name":"Color","value":"Blue"}'],
      ['filter.available', 'true'],
    ]);
    expect(parseFiltersFromParams(params)).toEqual([
      {variantOption: {name: 'Color', value: 'Red'}},
      {variantOption: {name: 'Color', value: 'Blue'}},
      {available: true},
    ]);
  });

  it('ignores non-filter params', () => {
    const params = new URLSearchParams('q=shirt&sort_by=PRICE_LOW_TO_HIGH');
    expect(parseFiltersFromParams(params)).toEqual([]);
  });

  it('skips malformed JSON values', () => {
    const params = new URLSearchParams('filter.color=not-json');
    expect(parseFiltersFromParams(params)).toEqual([]);
  });
});

describe('applyFilter', () => {
  it('appends a new filter to empty params', () => {
    const params = new URLSearchParams();
    const result = applyFilter(
      {variantOption: {name: 'Color', value: 'Red'}},
      params,
    );
    expect(result.get('filter.variantOption')).toBe(
      '{"name":"Color","value":"Red"}',
    );
  });

  it('appends a second value for the same key (multi-select)', () => {
    const params = new URLSearchParams(
      'filter.variantOption={"name":"Color","value":"Red"}',
    );
    const result = applyFilter(
      {variantOption: {name: 'Color', value: 'Blue'}},
      params,
    );
    expect(result.getAll('filter.variantOption')).toEqual([
      '{"name":"Color","value":"Red"}',
      '{"name":"Color","value":"Blue"}',
    ]);
  });

  it('does not duplicate an already-applied filter', () => {
    const params = new URLSearchParams(
      'filter.variantOption={"name":"Color","value":"Red"}',
    );
    const result = applyFilter(
      {variantOption: {name: 'Color', value: 'Red'}},
      params,
    );
    expect(result.getAll('filter.variantOption')).toEqual([
      '{"name":"Color","value":"Red"}',
    ]);
  });

  it('uses set for price filters (single value)', () => {
    const params = new URLSearchParams('filter.price={"min":10,"max":50}');
    const result = applyFilter({price: {min: 25, max: 100}}, params);
    expect(result.getAll('filter.price')).toEqual(['{"min":25,"max":100}']);
  });

  it('clears pagination cursors', () => {
    const params = new URLSearchParams('cursor=abc&direction=next');
    const result = applyFilter({available: true}, params);
    expect(result.has('cursor')).toBe(false);
    expect(result.has('direction')).toBe(false);
  });
});

describe('removeFilter', () => {
  it('removes a filter value', () => {
    const params = new URLSearchParams(
      'filter.variantOption={"name":"Color","value":"Red"}',
    );
    const result = removeFilter(
      {variantOption: {name: 'Color', value: 'Red'}},
      params,
    );
    expect(result.has('filter.variantOption')).toBe(false);
  });

  it('removes only the matching value when multiple exist', () => {
    const params = new URLSearchParams([
      ['filter.variantOption', '{"name":"Color","value":"Red"}'],
      ['filter.variantOption', '{"name":"Color","value":"Blue"}'],
    ]);
    const result = removeFilter(
      {variantOption: {name: 'Color', value: 'Red'}},
      params,
    );
    expect(result.getAll('filter.variantOption')).toEqual([
      '{"name":"Color","value":"Blue"}',
    ]);
  });

  it('is a no-op when the filter is not present', () => {
    const params = new URLSearchParams('filter.available=true');
    const result = removeFilter(
      {variantOption: {name: 'Color', value: 'Red'}},
      params,
    );
    expect(result.get('filter.available')).toBe('true');
  });

  it('clears pagination cursors', () => {
    const params = new URLSearchParams(
      'filter.available=true&cursor=abc&direction=next',
    );
    const result = removeFilter({available: true}, params);
    expect(result.has('cursor')).toBe(false);
    expect(result.has('direction')).toBe(false);
  });
});
