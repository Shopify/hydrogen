import {faker} from '@faker-js/faker';
import type {
  ShopifyAnalyticsPayload,
  ShopifyAnalyticsProduct,
} from './analytics-types.js';

export const BASE_PAYLOAD: ShopifyAnalyticsPayload = {
  hasUserConsent: true,
  shopId: 'gid://shopify/Shop/1',
  currency: 'USD',
  uniqueToken: faker.string.sample(),
  visitToken: faker.string.sample(),
  url: 'https://localhost:3000',
  path: '/',
  search: '',
  referrer: '',
  title: faker.string.sample(),
  userAgent: faker.string.sample(),
  navigationType: faker.string.sample(),
  navigationApi: faker.string.sample(),
};

export const BASE_PRODUCT_PAYLOAD: ShopifyAnalyticsProduct = {
  productGid: 'gid://shopify/Product/1',
  name: faker.string.sample(),
  brand: faker.string.sample(),
  price: faker.number.float().toString(),
};
