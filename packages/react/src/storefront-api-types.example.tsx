import type {
  Product,
  Collection,
} from '@shopify/storefront-kit-react/storefront-api-types';

const myProduct = {id: '123', title: 'My Product'} satisfies Partial<Product>;
console.log(myProduct.title);

const myCollection = {
  id: '456',
  title: 'My Collection',
} satisfies Partial<Collection>;
console.log(myCollection.title);

const myNotSatisfyingProduct: Partial<Product> = {
  id: '789',
  title: 'Other Product',
};
console.log(myNotSatisfyingProduct.title);
