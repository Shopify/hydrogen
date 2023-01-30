import * as React from 'react';
import {useShopifyCookies} from '@shopify/storefront-kit-react';

export default function App({Component, pageProps}) {
  useShopifyCookies();

  return <Component {...pageProps} />;
}
