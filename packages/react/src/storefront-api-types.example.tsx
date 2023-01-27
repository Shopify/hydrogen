import type {
  Product,
  Collection,
} from '@shopify/storefront-kit-react/storefront-api-types';

// @ts-expect-error - missing required fields
const myProduct: Product = {id: '123'};
console.log(myProduct.id);

// @ts-expect-error - missing required fields
const myCollection: Collection = {id: '123'};
console.log(myCollection.id);
