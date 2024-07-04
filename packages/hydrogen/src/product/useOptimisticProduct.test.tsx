import {expect, test, describe, beforeEach, afterEach, vi} from 'vitest';
import {useOptimisticProduct} from './useOptimisticProduct';
import {renderHook, waitFor} from '@testing-library/react';

let navigation = {state: 'idle', location: {search: ''}};

describe('useOptimisticProduct', () => {
  beforeEach(() => {
    vi.mock('@remix-run/react', async (importOrigninal) => {
      return {
        ...(await importOrigninal<typeof import('@remix-run/react')>()),
        useNavigation: () => {
          return navigation;
        },
      };
    });
    navigation = {state: 'idle', location: {search: ''}};
    vi.stubGlobal('reportError', vi.fn());
  });
  afterEach(() => {
    vi.clearAllMocks();
  });
  test('returns the original product if no fetchers are present', () => {
    const product = {title: 'Product'};
    const {result} = renderHook(() =>
      useOptimisticProduct(product, {
        product: {
          variants: {nodes: []},
        },
      }),
    );
    expect(result.current).toEqual(product);
  });

  test('returns the original product if no variants provided', () => {
    navigation = {
      state: 'loading',
      location: {search: new URLSearchParams('?variant=123').toString()},
    };
    const product = {title: 'Product'};
    const {result} = renderHook(() =>
      useOptimisticProduct(product, {
        product: {
          variants: {nodes: []},
        },
      }),
    );
    expect(result.current).toEqual(product);
  });

  test('returns an optimistic product', async () => {
    navigation = {
      state: 'loading',
      location: {
        search: new URLSearchParams(
          '?Size=158cm&Color=Sea+Green+%2F+Desert',
        ).toString(),
      },
    };
    const product = {title: 'Product'};
    const {result} = renderHook(() =>
      useOptimisticProduct(product, {
        product: {
          variants: {
            nodes: [
              {
                id: 'gid://shopify/ProductVariant/123',
                title: '158cm Sea Green / Desert',
                selectedOptions: [
                  {name: 'Size', value: '158cm'},
                  {name: 'Color', value: 'Sea Green / Desert'},
                ],
              },
            ],
          },
        },
      }),
    );

    await waitFor(() => {
      expect(result.current.isOptimistic).toEqual(true);
      // @ts-expect-error
      expect(result.current.selectedVariant).toEqual({
        id: 'gid://shopify/ProductVariant/123',
        title: '158cm Sea Green / Desert',
        selectedOptions: [
          {name: 'Size', value: '158cm'},
          {name: 'Color', value: 'Sea Green / Desert'},
        ],
      });
    });
  });

  test('returns an optimistic product when using a direct variant array', async () => {
    navigation = {
      state: 'loading',
      location: {
        search: new URLSearchParams(
          '?Size=158cm&Color=Sea+Green+%2F+Desert',
        ).toString(),
      },
    };
    const product = {title: 'Product'};
    const {result} = renderHook(() =>
      useOptimisticProduct(product, [
        {
          id: 'gid://shopify/ProductVariant/123',
          title: '158cm Sea Green / Desert',
          selectedOptions: [
            {name: 'Size', value: '158cm'},
            {name: 'Color', value: 'Sea Green / Desert'},
          ],
        },
      ]),
    );

    await waitFor(() => {
      expect(result.current.isOptimistic).toEqual(true);
      // @ts-expect-error
      expect(result.current.selectedVariant).toEqual({
        id: 'gid://shopify/ProductVariant/123',
        title: '158cm Sea Green / Desert',
        selectedOptions: [
          {name: 'Size', value: '158cm'},
          {name: 'Color', value: 'Sea Green / Desert'},
        ],
      });
    });
  });

  test('returns an optimistic product when URL has unknown search params', async () => {
    navigation = {
      state: 'loading',
      location: {
        search: new URLSearchParams(
          '?Size=158cm&Color=Sea+Green+%2F+Desert&unknown=param',
        ).toString(),
      },
    };
    const product = {title: 'Product'};
    const {result} = renderHook(() =>
      useOptimisticProduct(product, {
        product: {
          variants: {
            nodes: [
              {
                id: 'gid://shopify/ProductVariant/123',
                title: '158cm Sea Green / Desert',
                selectedOptions: [
                  {name: 'Size', value: '158cm'},
                  {name: 'Color', value: 'Sea Green / Desert'},
                ],
              },
            ],
          },
        },
      }),
    );

    await waitFor(() => {
      expect(result.current.isOptimistic).toEqual(true);
      // @ts-expect-error
      expect(result.current.selectedVariant).toEqual({
        id: 'gid://shopify/ProductVariant/123',
        title: '158cm Sea Green / Desert',
        selectedOptions: [
          {name: 'Size', value: '158cm'},
          {name: 'Color', value: 'Sea Green / Desert'},
        ],
      });
    });
  });

  test('errors when selectedOptions is not included in variants', async () => {
    navigation = {
      state: 'loading',
      location: {
        search: new URLSearchParams(
          '?Size=158cm&Color=Sea+Green+%2F+Desert',
        ).toString(),
      },
    };
    const product = {title: 'Product'};
    renderHook(() =>
      useOptimisticProduct(product, {
        product: {
          variants: {
            nodes: [
              {
                id: 'gid://shopify/ProductVariant/123',
                title: '158cm Sea Green / Desert',
              },
            ],
          },
        },
      }),
    );

    await waitFor(() => {
      expect(globalThis.reportError).toHaveBeenCalledWith(
        new Error(
          '[h2:error:useOptimisticProduct] The optimistic product hook requires your product query to include variants with the selectedOptions field.',
        ),
      );
    });
  });
});
