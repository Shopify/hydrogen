import {useCustomerPrivacy} from '@shopify/hydrogen';

export function MyComponent() {
  useCustomerPrivacy({
    storefrontAccessToken: '12345',
    checkoutDomain: 'checkout.example.com',
    onVisitorConsentCollected: (consent) => {
      console.log('Visitor consent collected:', consent);
    },
  });
}
