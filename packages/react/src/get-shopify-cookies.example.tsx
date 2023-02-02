import * as React from 'react';
import {useEffect} from 'react';
import {getShopifyCookies} from '@shopify/hydrogen-react';

export default function App({Component, pageProps}) {
  useEffect(() => {
    getShopifyCookies(document.cookie);
  });

  return <Component {...pageProps} />;
}
