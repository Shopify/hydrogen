import {faker} from '@faker-js/faker';

export const BASE_PAYLOAD = {
  hasUserConsent: true,
  shopId: 'gid://shopify/Shop/1',
  currency: 'USD',
  uniqueToken: faker.datatype.string(),
  visitToken: faker.datatype.string(),
  url: 'https://localhost:3000',
  path: '/',
  search: '',
  referrer: '',
  title: faker.datatype.string(),
  userAgent: faker.datatype.string(),
  navigationType: faker.datatype.string(),
  navigationApi: faker.datatype.string(),
};

export const BASE_PRODUCT_PAYLOAD = {
  productGid: 'gid://shopify/Product/1',
  name: faker.datatype.string(),
  brand: faker.datatype.string(),
  price: faker.datatype.number().toString(),
};
