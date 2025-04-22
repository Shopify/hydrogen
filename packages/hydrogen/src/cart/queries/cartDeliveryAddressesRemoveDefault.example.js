import {cartDeliveryAddressesRemoveDefault} from '@shopify/hydrogen';

const removeDeliveryAddresses = cartDeliveryAddressesRemoveDefault({
  storefront,
  getCartId,
});

const result = await removeDeliveryAddresses(
  ['gid://shopify/<objectName>/10079785100'],
  {someOptionalParam: 'value'},
);
