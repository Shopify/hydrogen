import {cartDeliveryAddressesReplaceDefault} from '@shopify/hydrogen';

const replaceDeliveryAddresses = cartDeliveryAddressesReplaceDefault({
  storefront,
  getCartId,
});

const result = await replaceDeliveryAddresses(
  [
    {
      address: {
        deliveryAddress: {
          address1: '<your-address1>',
          address2: '<your-address2>',
          city: '<your-city>',
          company: '<your-company>',
          countryCode: 'AC',
          firstName: '<your-firstName>',
          lastName: '<your-lastName>',
          phone: '<your-phone>',
          provinceCode: '<your-provinceCode>',
          zip: '<your-zip>',
        },
      },
      selected: true,
    },
  ],
  {someOptionalParam: 'value'},
);
