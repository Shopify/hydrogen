import * as React from 'react';
import {useShopifyCookies} from '@shopify/hydrogen-react';

export default function App({Component, pageProps}) {
  // Returns true when cookies are ready
  const cookiesReady = useShopifyCookies({hasUserConsent: true});

  if (!cookiesReady) {
    return null;
  }

  return <Component {...pageProps} />;
}
