import { cartDeliveryAddressesUpdateDefault } from '@shopify/hydrogen';

const updateDeliveryAddresses = cartDeliveryAddressesUpdateDefault({
  storefront, getCartId,
});

const result = await updateDeliveryAddresses([
  {
    id: "gid://shopify/<objectName>/10079785100",
    address: {
      // copyFromCustomerAddressId: ID
      deliveryAddress: {
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
    },
    oneTimeUse: true,
    selected: true,
  }
], { someOptionalParam: 'value' });

