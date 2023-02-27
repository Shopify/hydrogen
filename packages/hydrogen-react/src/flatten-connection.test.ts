import {PartialDeep} from 'type-fest';
import {ProductConnection, Product} from './storefront-api-types.js';
import {flattenConnection} from './flatten-connection.js';
import {vi} from 'vitest';
import {expectType, TypeEqual} from 'ts-expect';

describe('flattenConnection', () => {
  it('flattens legacy edges', () => {
    const connection: PartialDeep<
      ProductConnection,
      {recurseIntoArrays: true}
    > = {
      edges: [
        {
          node: {
            id: '1',
            title: 'Product 1',
          },
        },
        {
          node: {
            id: '2',
            title: 'Product 2',
          },
        },
      ],
    };

    expect(flattenConnection(connection)).toEqual([
      {
        id: '1',
        title: 'Product 1',
      },
      {
        id: '2',
        title: 'Product 2',
      },
    ]);
  });

  it('flattens nodes', () => {
    const connection: PartialDeep<
      ProductConnection,
      {recurseIntoArrays: true}
    > = {
      nodes: [
        {
          id: '1',
          title: 'Product 1',
        },
        {
          id: '2',
          title: 'Product 2',
        },
      ],
    };

    expect(flattenConnection(connection)).toEqual([
      {
        id: '1',
        title: 'Product 1',
      },
      {
        id: '2',
        title: 'Product 2',
      },
    ]);
  });

  it(`returns an empty array when neither edges.nodes or nodes exists`, () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(flattenConnection({})).toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });

  // eslint-disable-next-line jest/expect-expect
  it.skip(`has correct typescript types`, () => {
    // works without PartialDeep
    const type1 = flattenConnection({} as ProductConnection);
    expectType<TypeEqual<typeof type1, Product[]>>(true);

    // works with PartialDeep
    const type2 = flattenConnection(
      {} as PartialDeep<ProductConnection, {recurseIntoArrays: true}>
    );
    expectType<
      TypeEqual<typeof type2, PartialDeep<Product[], {recurseIntoArrays: true}>>
    >(true);

    // works when passing the generic yourself + no PartialDeep
    // @ts-expect-error empty object is expected here just for testing purposes
    const type3 = flattenConnection<ProductConnection>({});
    expectType<TypeEqual<typeof type3, Product[]>>(true);

    // works when passing the generic yourself + PartialDeep
    const type4 = flattenConnection<
      PartialDeep<ProductConnection, {recurseIntoArrays: true}>
    >({});
    expectType<
      TypeEqual<typeof type4, PartialDeep<Product[], {recurseIntoArrays: true}>>
    >(true);
  });
});
