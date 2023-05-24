import {cartLinesAddDefault} from '@shopify/hydrogen';

const cartAdd = cartLinesAddDefault({
  storefront,
  getCartId,
});

cartAdd({
  merchandiseId: 'gid://shopify/ProductVariant/123456789',
  quantity: 1,
});
