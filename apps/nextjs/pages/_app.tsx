import '../styles/globals.css';
import type {AppProps} from 'next/app';
import {ShopifyProvider, CartProvider} from '@shopify/hydrogen-react';

export default function App({Component, pageProps}: AppProps) {
  return (
    <ShopifyProvider
      shopifyConfig={{
        storeDomain: `hydrogen-preview`,
        storefrontToken: '3b580e70970c4528da70c98e097c2fa0',
        storefrontApiVersion: '2022-10',
        locale: 'EN-US',
      }}
    >
      <CartProvider>
        <Component {...pageProps} />
      </CartProvider>
    </ShopifyProvider>
  );
}
