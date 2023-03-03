import * as React from 'react';
import {useShopifyCookies} from '@shopify/hydrogen-react';

export default function App({Component, pageProps}) {
  useShopifyCookies({hasUserConsent: false});

  return <Component {...pageProps} />;
}
