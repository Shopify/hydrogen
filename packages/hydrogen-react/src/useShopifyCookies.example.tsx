import * as React from 'react';
import {useShopifyCookies} from '@shopify/hydrogen-react';

export default function App({
  Component,
  pageProps,
}: {
  Component: React.ComponentType;
  pageProps: object;
}) {
  // Returns true when cookies are ready
  const cookiesReady = useShopifyCookies({hasUserConsent: true});

  if (!cookiesReady) {
    return null;
  }

  return <Component {...pageProps} />;
}
