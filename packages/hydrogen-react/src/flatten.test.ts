import {vi, describe, it, expect} from 'vitest';

import {PartialDeep} from 'type-fest';
import {
  ProductConnection,
  Product,
  CollectionConnection,
  Collection,
} from './storefront-api-types.js';
import {flatten} from './flatten.js';
import {expectType, TypeEqual} from 'ts-expect';

describe('flatten', () => {
  it('Recursively flattens legacy edges', () => {
    const collection: PartialDeep<Collection, {recurseIntoArrays: true}> = {
      id: '1',
      handle: 'men',
      products: {
        edges: [
          {
            node: {
              id: '1-1',
              title: 'Hoodie',
              variants: {
                edges: [
                  {
                    node: {
                      id: '1-1-1',
                      title: 'Small / Green',
                    },
                  },
                  {
                    node: {
                      id: '1-1-2',
                      title: 'Small / Olive',
                    },
                  },
                ],
              },
            },
          },
          {
            node: {
              id: '1-2',
              title: "Men's T-shirt",
              variants: {
                edges: [
                  {
                    node: {
                      id: '1-2-1',
                      title: 'Small / Green',
                    },
                  },
                  {
                    node: {
                      id: '1-2-2',
                      title: 'Small / Olive',
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    };

    expect(flatten(collection)).toEqual({
      id: '1',
      handle: 'men',
      products: [
        {
          id: '1-1',
          title: 'Hoodie',
          variants: [
            {
              id: '1-1-1',
              title: 'Small / Green',
            },
            {
              id: '1-1-2',
              title: 'Small / Olive',
            },
          ],
        },
        {
          id: '1-2',
          title: "Men's T-shirt",
          variants: [
            {
              id: '1-2-1',
              title: 'Small / Green',
            },
            {
              id: '1-2-2',
              title: 'Small / Olive',
            },
          ],
        },
      ],
    });
  });

  it('Recursively flattens nodes', () => {
    const collection: PartialDeep<Collection, {recurseIntoArrays: true}> = {
      id: '1',
      handle: 'men',
      products: {
        nodes: [
          {
            id: '1-1',
            title: 'Hoodie',
            variants: {
              nodes: [
                {
                  id: '1-1-1',
                  title: 'Small / Green',
                },
                {
                  id: '1-1-2',
                  title: 'Small / Olive',
                },
              ],
            },
          },
          {
            id: '1-2',
            title: "Men's T-shirt",
            variants: {
              nodes: [
                {
                  id: '1-2-1',
                  title: 'Small / Green',
                },
                {
                  id: '1-2-2',
                  title: 'Small / Olive',
                },
              ],
            },
          },
        ],
      },
    };

    expect(flatten(collection)).toEqual({
      id: '1',
      handle: 'men',
      products: [
        {
          id: '1-1',
          title: 'Hoodie',
          variants: [
            {
              id: '1-1-1',
              title: 'Small / Green',
            },
            {
              id: '1-1-2',
              title: 'Small / Olive',
            },
          ],
        },
        {
          id: '1-2',
          title: "Men's T-shirt",
          variants: [
            {
              id: '1-2-1',
              title: 'Small / Green',
            },
            {
              id: '1-2-2',
              title: 'Small / Olive',
            },
          ],
        },
      ],
    });
  });

  it('recursively flattens mix of legacy edges and nodes', () => {
    const collection: PartialDeep<Collection, {recurseIntoArrays: true}> = {
      id: '1',
      handle: 'men',
      products: {
        edges: [
          {
            node: {
              id: '1-1',
              title: 'Hoodie',
              variants: {
                nodes: [
                  {
                    id: '1-1-1',
                    title: 'Small / Green',
                  },
                  {
                    id: '1-1-2',
                    title: 'Small / Olive',
                  },
                ],
              },
            },
          },
          {
            node: {
              id: '1-2',
              title: "Men's T-shirt",
              variants: {
                nodes: [
                  {
                    id: '1-2-1',
                    title: 'Small / Green',
                  },
                  {
                    id: '1-2-2',
                    title: 'Small / Olive',
                  },
                ],
              },
            },
          },
        ],
      },
    };

    expect(flatten(collection)).toEqual({
      id: '1',
      handle: 'men',
      products: [
        {
          id: '1-1',
          title: 'Hoodie',
          variants: [
            {
              id: '1-1-1',
              title: 'Small / Green',
            },
            {
              id: '1-1-2',
              title: 'Small / Olive',
            },
          ],
        },
        {
          id: '1-2',
          title: "Men's T-shirt",
          variants: [
            {
              id: '1-2-1',
              title: 'Small / Green',
            },
            {
              id: '1-2-2',
              title: 'Small / Olive',
            },
          ],
        },
      ],
    });
  });

  it('recursively flattens when the root is a connection', () => {
    const connection: PartialDeep<
      CollectionConnection,
      {recurseIntoArrays: true}
    > = {
      edges: [
        {
          node: {
            id: 'C1',
            title: 'Collection 1',
            products: {
              nodes: [
                {
                  id: 'P1',
                  title: 'Product 1',
                },
                {
                  id: 'P2',
                  title: 'Product 2',
                },
              ],
            },
          },
        },
        {
          node: {
            id: 'C2',
            title: 'Collection 2',
            products: {
              nodes: [
                {
                  id: 'P3',
                  title: 'Product 3',
                },
                {
                  id: 'P4',
                  title: 'Product 4',
                },
              ],
            },
          },
        },
      ],
    };

    expect(flatten(connection)).toEqual([
      {
        id: 'C1',
        title: 'Collection 1',
        products: [
          {
            id: 'P1',
            title: 'Product 1',
          },
          {
            id: 'P2',
            title: 'Product 2',
          },
        ],
      },
      {
        id: 'C2',
        title: 'Collection 2',
        products: [
          {
            id: 'P3',
            title: 'Product 3',
          },
          {
            id: 'P4',
            title: 'Product 4',
          },
        ],
      },
    ]);
  });

  it(`returns original object when there are no edges.nodes, nodes or metafields`, () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    expect(flatten({})).toEqual({});
  });

  it.skip(`has correct typescript types`, () => {});
});
