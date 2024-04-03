import {useCustomerPrivacy} from '@shopify/hydrogen';

export function MyComponent() {
  useCustomerPrivacy({
    storefrontAccessToken: '12345',
    storeDomain: 'example.com',
    checkoutDomain: 'checkout.example.com',
    onVisitorConsentCollected: (consent) => {
      console.log('Visitor consent collected:', consent);
    },
  });
}
