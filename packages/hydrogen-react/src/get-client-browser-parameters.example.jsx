import * as React from 'react';
import {useEffect} from 'react';
import {getClientBrowserParameters} from '@shopify/hydrogen-react';

export default function App({Component, pageProps}) {
  useEffect(() => {
    getClientBrowserParameters();
  });

  return <Component {...pageProps} />;
}
