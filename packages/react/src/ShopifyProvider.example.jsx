import {ShopifyProvider} from '@shopify/storefront-kit-react';

export default function App() {
  return (
    <ShopifyProvider
      shopifyConfig={{
        storeDomain: 'my-store',
        storefrontToken: 'abc123',
        storefrontApiVersion: '2022-10',
      }}
    >
      {/* rest of your client-side app */}
    </ShopifyProvider>
  );
}
