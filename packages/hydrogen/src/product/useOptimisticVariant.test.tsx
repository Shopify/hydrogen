import {expect, it, describe, beforeEach, afterEach, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
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

  it('returns the original product if no fetchers are present', () => {
    const variant = {title: 'Product'};
    const {result} = renderHook(() =>
      useOptimisticVariant(variant, {
        product: {
          variants: {nodes: []},
        },
      }),
    );
    expect(result.current).toEqual(variant);
  });

  it('returns the original product if no variants provided', () => {
    vi.mocked(useNavigation).mockImplementation(() => ({
      state: 'loading',
      // @ts-expect-error
      location: {search: new URLSearchParams('?variant=123').toString()},
    }));

    const variant = {title: 'Product'};
    const {result} = renderHook(() =>
      useOptimisticVariant(variant, {
        product: {
          variants: {nodes: []},
        },
      }),
    );
    expect(result.current).toEqual(variant);
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

    const variant = {title: 'Product'};
    const {result} = renderHook(() =>
      useOptimisticVariant(variant, {
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

    const variant = {title: 'Product'};
    const {result} = renderHook(() =>
      useOptimisticVariant(variant, [
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

    const variant = {title: 'Product'};
    const {result} = renderHook(() =>
      useOptimisticVariant(variant, {
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

    const variant = {title: 'Product'};
    renderHook(() =>
      useOptimisticVariant(variant, {
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
          '[h2:error:useOptimisticVariant] The optimistic product hook requires your product query to include variants with the selectedOptions field.',
        ),
      );
    });
  });
});
