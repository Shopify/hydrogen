import {describe, it, expect} from 'vitest';
import {
  parseSortParam,
  applySortParam,
  COLLECTION_SORT_OPTIONS,
  SEARCH_SORT_OPTIONS,
} from './product-sort';

describe('parseSortParam', () => {
  it('returns undefined when no sort_by param exists', () => {
    const params = new URLSearchParams('q=shirt');
    expect(parseSortParam(params)).toBeUndefined();
  });

  it('returns the matching collection sort option', () => {
    const params = new URLSearchParams('sort_by=PRICE_LOW_TO_HIGH');
    expect(parseSortParam(params)).toEqual(
      COLLECTION_SORT_OPTIONS.PRICE_LOW_TO_HIGH,
    );
  });

  it('returns the matching search sort option when isSearch is true', () => {
    const params = new URLSearchParams('sort_by=RELEVANCE');
    expect(parseSortParam(params, true)).toEqual(SEARCH_SORT_OPTIONS.RELEVANCE);
  });

  it('returns undefined for an unrecognised value', () => {
    const params = new URLSearchParams('sort_by=INVALID');
    expect(parseSortParam(params)).toBeUndefined();
  });

  it('returns undefined for a search-only key used without isSearch', () => {
    const params = new URLSearchParams('sort_by=RELEVANCE');
    // RELEVANCE exists in SEARCH_SORT_OPTIONS but not COLLECTION_SORT_OPTIONS
    expect(parseSortParam(params)).toBeUndefined();
  });
});

describe('applySortParam', () => {
  it('sets the sort_by param', () => {
    const params = new URLSearchParams();
    const result = applySortParam('PRICE_LOW_TO_HIGH', params);
    expect(result.get('sort_by')).toBe('PRICE_LOW_TO_HIGH');
  });

  it('removes sort_by for the default collection sort (FEATURED)', () => {
    const params = new URLSearchParams('sort_by=PRICE_LOW_TO_HIGH');
    const result = applySortParam('FEATURED', params);
    expect(result.has('sort_by')).toBe(false);
  });

  it('removes sort_by for the default search sort (RELEVANCE)', () => {
    const params = new URLSearchParams('sort_by=PRICE_LOW_TO_HIGH');
    const result = applySortParam('RELEVANCE', params);
    expect(result.has('sort_by')).toBe(false);
  });

  it('clears pagination cursors', () => {
    const params = new URLSearchParams('cursor=abc&direction=next');
    const result = applySortParam('PRICE_LOW_TO_HIGH', params);
    expect(result.has('cursor')).toBe(false);
    expect(result.has('direction')).toBe(false);
  });

  it('preserves other params', () => {
    const params = new URLSearchParams('q=shirt&filter.available=true');
    const result = applySortParam('PRICE_LOW_TO_HIGH', params);
    expect(result.get('q')).toBe('shirt');
    expect(result.get('filter.available')).toBe('true');
    expect(result.get('sort_by')).toBe('PRICE_LOW_TO_HIGH');
  });
});
