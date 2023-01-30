import * as React from 'react';
import {useEffect} from 'react';
import {getShopifyCookies} from '@shopify/storefront-kit-react';

export default function App({Component, pageProps}) {
  useEffect(() => {
    getShopifyCookies(document.cookie);
  });

  return <Component {...pageProps} />;
}
