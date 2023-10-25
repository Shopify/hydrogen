import {describe, expect, it} from 'vitest';
import {hashKey} from './hash';

describe('hashKey', () => {
  it('hashes the raw keys provided by storefront.query', () => {
    const keys = [
      'https://hydrogen-preview.myshopify.com/api/2023-07/graphql.json',
      {
        body: 'query () {}',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-SDK-Variant': 'hydrogen-react',
          'X-SDK-Variant-Source': 'react',
          'X-SDK-Version': '2023-07',
          'X-Shopify-Storefront-Access-Token': 'test',
          'user-agent': 'Hydrogen 2023.7.11',
        },
      },
    ];

    const hashed = hashKey(keys);

    expect(hashed).toMatchInlineSnapshot(
      '"https%3A%2F%2Fhydrogen-preview.myshopify.com%2Fapi%2F2023-07%2Fgraphql.json%7B%22body%22%3A%22query%20()%20%7B%7D%22%2C%22method%22%3A%22POST%22%2C%22headers%22%3A%7B%22content-type%22%3A%22application%2Fjson%22%2C%22X-SDK-Variant%22%3A%22hydrogen-react%22%2C%22X-SDK-Variant-Source%22%3A%22react%22%2C%22X-SDK-Version%22%3A%222023-07%22%2C%22X-Shopify-Storefront-Access-Token%22%3A%22test%22%2C%22user-agent%22%3A%22Hydrogen%202023.7.11%22%7D%7D"',
    );
    expect(hashed).toContain(
      encodeURIComponent('"X-Shopify-Storefront-Access-Token":"test"'),
    );
    expect(hashed).toContain(encodeURIComponent('"body":"query () {}"'));
  });

  it('hashes the raw keys may provided by createWithCache', () => {
    const keys = [
      'string',
      1,
      {test: 'object'},
      ['test', 'array'],
      new Headers({some: 'header'}),
    ];

    const hashed = hashKey(keys);

    expect(hashed).toMatchInlineSnapshot(
      '"string1%7B%22test%22%3A%22object%22%7D%5B%22test%22%2C%22array%22%5D%7B%7D"',
    );
  });
});
