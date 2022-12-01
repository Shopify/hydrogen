import {CartLineInput} from '@shopify/hydrogen-react/storefront-api-types';
import {useEffect, useRef, useState} from 'react';

/**
 * React wrapper for Shopify's shop pay web component
 * @param lines an array of CartLineInput[] to add to the cart
 * @returns
 */
export function ShopPayCheckoutButton({lines}: {lines: CartLineInput[]}) {
  const appended = useRef(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (appended.current) return;

    const isRegistered =
      document.createElement('shop-pay-button').constructor !== HTMLElement;
    if (isRegistered) {
      setLoaded(true);
      return;
    }

    // Load and append shop pay web component
    const script = document.createElement('script');
    script.src = 'https://cdn.shopify.com/shopifycloud/shop-js/client.js';
    script.onload = function () {
      setLoaded(true);
    };
    document.head.appendChild(script);

    appended.current = true;
  }, []);

  return (
    <>
      {loaded ? (
        <shop-pay-button
          store-url="https://hydrogen-preview.myshopify.com"
          variants={`${variant.id.split('/').pop()}:${quantity}`}
        />
      ) : (
        <p>Loading...</p>
      )}
    </>
  );
}
