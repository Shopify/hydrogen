import {describe, it, expect} from 'vitest';
import {getSelectedProductOptions} from './getSelectedProductOptions';

describe('getSelectedProductOptions', () => {
  it('returns an empty array when no search params are present', () => {
    const request = new Request('https://example.com/products/test-product');
    const result = getSelectedProductOptions(request);
    expect(result).toEqual([]);
  });

  it('returns selected options from search params', () => {
    const request = new Request('https://example.com/products/test-product?color=red&size=large');
    const result = getSelectedProductOptions(request);
    expect(result).toEqual([
      {name: 'color', value: 'red'},
      {name: 'size', value: 'large'},
    ]);
  });

  it('handles multiple values for the same option name', () => {
    const request = new Request('https://example.com/products/test-product?color=red&color=blue');
    const result = getSelectedProductOptions(request);
    expect(result).toEqual([
      {name: 'color', value: 'red'},
      {name: 'color', value: 'blue'},
    ]);
  });

  it('handles special characters in option values', () => {
    const request = new Request('https://example.com/products/test-product?size=extra%20large&material=100%25%20cotton');
    const result = getSelectedProductOptions(request);
    expect(result).toEqual([
      {name: 'size', value: 'extra large'},
      {name: 'material', value: '100% cotton'},
    ]);
  });

  it('preserves the order of options as they appear in the URL', () => {
    const request = new Request('https://example.com/products/test-product?size=large&color=red&material=cotton');
    const result = getSelectedProductOptions(request);
    expect(result).toEqual([
      {name: 'size', value: 'large'},
      {name: 'color', value: 'red'},
      {name: 'material', value: 'cotton'},
    ]);
  });
});