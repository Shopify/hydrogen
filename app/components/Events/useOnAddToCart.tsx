import {useFetchers} from '@remix-run/react';
import {useEffect, useRef} from 'react';

export function useOnAddToCart(
  callback?: (data: any) => any,
  options?: {forwardToServer: boolean} | undefined
) {
  const fetchers = useFetchers();
  const addLines = useRef(null);

  const addToCartFetcher = fetchers.find(
    (fetcher) => fetcher?.submission?.action === '/cart'
  );

  useEffect(() => {
    // first render, save the addedLine
    if (addToCartFetcher?.data?.addedLine) {
      addLines.current = addToCartFetcher.data.addedLine;
      console.log('Adding to cart', addLines.current)
    }

    // second render, resolve the updated cart promise and then emit the event
    if (addLines.current && !addToCartFetcher) {
      const descriptionTag = document.querySelector(
        'meta[name=description]'
      ) as HTMLMetaElement;
      const description = descriptionTag ? descriptionTag.content : '';
      const title = document.title;

      let payload = {
        event: {
          type: 'add_to_cart',
          id: crypto.randomUUID(),
          time: new Date().toISOString(),
        },
        page: {
          url: location,
          title,
          description,
        },
        data: {
          addedCartLines: addLines.current,
        },
      };

      console.log('Added to cart', payload)
      // capture the return user-modified payload (optional)
      let userPayload;
      if (typeof callback === 'function') {
        userPayload = callback(payload);
      }

      // send the
      if (options?.forwardToServer) {
        navigator.sendBeacon(`/events?type=${payload.event.type}`, JSON.stringify(userPayload || payload));
      }

      console.log(`🛒 EVENT:${payload.event.type}`, location.pathname, userPayload || payload);

      // @todo could be more than one variantId
      addLines.current = null;
    }
  }, [
    addToCartFetcher,
    addToCartFetcher?.submission?.key,
  ]);

  return;
}
