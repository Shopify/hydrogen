import {expect, it, describe, beforeEach, afterEach, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {useNavigation} from '@remix-run/react';
import {useOptimisticVariant} from './useOptimisticVariant';

describe('useOptimisticVariant', () => {
  beforeEach(() => {
    vi.stubGlobal('reportError', vi.fn());
    vi.mock('@remix-run/react', async (importOrigninal) => {
      return {
        ...(await importOrigninal<typeof import('@remix-run/react')>()),
        useNavigation: vi.fn(() => ({state: 'idle', location: {search: ''}})),
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns the original product if no fetchers are present', async () => {
    // Do not create hook params inline inside `renderHook`
    // to avoid infinite re-renders.
    const selectedVariant = {title: 'Product'};
    const variants = {product: {variants: {nodes: []}}};

    const {result} = renderHook(() =>
      useOptimisticVariant(selectedVariant, variants),
    );

    // The hook runs `Promise.resolve(variants).then(...)`, which
    // becomes an async operation. Wait here for the next tick before
    // asserting the result.
    await act(async () => {});

    expect(result.current).toEqual(selectedVariant);
  });

  it('returns the original product if no variants provided', async () => {
    vi.mocked(useNavigation).mockImplementation(() => ({
      state: 'loading',
      // @ts-expect-error
      location: {search: new URLSearchParams('?variant=123').toString()},
    }));

    const selectedVariant = {title: 'Product'};
    const variants = {product: {variants: {nodes: []}}};

    const {result} = renderHook(() =>
      useOptimisticVariant(selectedVariant, variants),
    );

    await act(async () => {});

    expect(result.current).toEqual(selectedVariant);
  });

  it('returns an optimistic product', async () => {
    vi.mocked(useNavigation).mockImplementation(() => ({
      state: 'loading',
      // @ts-expect-error
      location: {
        search: new URLSearchParams(
          '?Size=158cm&Color=Sea+Green+%2F+Desert',
        ).toString(),
      },
    }));

    const selectedVariant = {title: 'Product'};
    const variants = {
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
    };

    const {result} = renderHook(() =>
      useOptimisticVariant(selectedVariant, variants),
    );

    await act(async () => {});

    expect(result.current).toEqual({
      isOptimistic: true,
      id: 'gid://shopify/ProductVariant/123',
      title: '158cm Sea Green / Desert',
      selectedOptions: [
        {name: 'Size', value: '158cm'},
        {name: 'Color', value: 'Sea Green / Desert'},
      ],
    });
  });

  it('returns an optimistic product when using a direct variant array', async () => {
    vi.mocked(useNavigation).mockImplementation(() => ({
      state: 'loading',
      // @ts-expect-error
      location: {
        search: new URLSearchParams(
          '?Size=158cm&Color=Sea+Green+%2F+Desert',
        ).toString(),
      },
    }));

    const selectedVariant = {title: 'Product'};
    const variants = [
      {
        id: 'gid://shopify/ProductVariant/123',
        title: '158cm Sea Green / Desert',
        selectedOptions: [
          {name: 'Size', value: '158cm'},
          {name: 'Color', value: 'Sea Green / Desert'},
        ],
      },
    ];

    const {result} = renderHook(() =>
      useOptimisticVariant(selectedVariant, variants),
    );

    await act(async () => {});

    expect(result.current).toEqual({
      isOptimistic: true,
      id: 'gid://shopify/ProductVariant/123',
      title: '158cm Sea Green / Desert',
      selectedOptions: [
        {name: 'Size', value: '158cm'},
        {name: 'Color', value: 'Sea Green / Desert'},
      ],
    });
  });

  it('returns an optimistic product when URL has unknown search params', async () => {
    vi.mocked(useNavigation).mockImplementation(() => ({
      state: 'loading',
      // @ts-expect-error
      location: {
        search: new URLSearchParams(
          '?Size=158cm&Color=Sea+Green+%2F+Desert&unknown=param',
        ).toString(),
      },
    }));

    const selectedVariant = {title: 'Product'};
    const variants = {
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
    };

    const {result} = renderHook(() =>
      useOptimisticVariant(selectedVariant, variants),
    );

    await act(async () => {});

    expect(result.current).toEqual({
      isOptimistic: true,
      id: 'gid://shopify/ProductVariant/123',
      title: '158cm Sea Green / Desert',
      selectedOptions: [
        {name: 'Size', value: '158cm'},
        {name: 'Color', value: 'Sea Green / Desert'},
      ],
    });
  });

  it('errors when selectedOptions is not included in variants', async () => {
    vi.mocked(useNavigation).mockImplementation(() => ({
      state: 'loading',
      // @ts-expect-error
      location: {
        search: new URLSearchParams(
          '?Size=158cm&Color=Sea+Green+%2F+Desert',
        ).toString(),
      },
    }));

    const selectedVariant = {title: 'Product'};
    const variants = {
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
    };

    renderHook(() => useOptimisticVariant(selectedVariant, variants));

    await act(async () => {});

    expect(globalThis.reportError).toHaveBeenCalledWith(
      new Error(
        '[h2:error:useOptimisticVariant] The optimistic product hook requires your product query to include variants with the selectedOptions field.',
      ),
    );
  });
});
