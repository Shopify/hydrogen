import { cartDeliveryAddressesRemoveDefault } from '@shopify/hydrogen';

const removeDeliveAddresses = cartDeliveryAddressesRemoveDefault({ storefront, getCartId });

const result = await removeDeliveAddresses([
  "gid://shopify/<objectName>/10079785100"
],
  { someOptionalParam: 'value' });

