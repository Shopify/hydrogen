import { cartDeliveryAddressesAddDefault } from '@shopify/hydrogen';

const addDeliveryAddresses = cartDeliveryAddressesAddDefault({
  storefront, getCartId,
});

const result = await addDeliveryAddresses([
  {
    address1: "<your-address1>",
    address2: "<your-address2>",
    city: "<your-city>",
    company: "<your-company>",
    countryCode: "AC",
    firstName: "<your-firstName>",
    lastName: "<your-lastName>",
    phone: "<your-phone>",
    provinceCode: "<your-provinceCode>",
    zip: "<your-zip>"
    // other address fields...
  }
], { someOptionalParam: 'value' });

