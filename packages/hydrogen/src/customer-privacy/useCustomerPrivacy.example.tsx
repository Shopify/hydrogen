import {
  type VisitorConsentCollected,
  useCustomerPrivacy,
} from '@shopify/hydrogen';

export function MyComponent() {
  useCustomerPrivacy({
    storefrontAccessToken: '12345',
    shopDomain: 'example.com',
    checkoutRootDomain: 'checkout.example.com',
    onVisitorConsentCollected: (consent: VisitorConsentCollected) => {
      console.log('Visitor consent collected:', consent);
    },
  });
}
