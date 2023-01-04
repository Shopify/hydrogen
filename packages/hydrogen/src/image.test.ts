import {test, expect} from '@jest/globals';
import {generateShopifySrcSet} from './image';

test('src set', () => {
  expect(
    generateShopifySrcSet(
      'https://cdn.shopify.com/static/sample-images/garnished.jpeg',
      [
        {width: 200, height: 200, crop: 'center'},
        {width: 400, height: 400, crop: 'center'},
      ],
    ),
  ).toBe(
    'https://cdn.shopify.com/static/sample-images/garnished.jpeg?width=200&height=200&crop=center 200w, https://cdn.shopify.com/static/sample-images/garnished.jpeg?width=400&height=400&crop=center 400w',
  );
});
