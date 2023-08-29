import {getLoggedRequest} from '@shopify/hydrogen';
import type {LoaderArgs} from '@shopify/remix-oxygen';
import {eventStream} from 'remix-utils';

export async function loader({request}: LoaderArgs) {
  return eventStream(request.signal, function setup(send) {
    const timer = setInterval(() => {
      const request = getLoggedRequest();
      if (request) {
        send(request);
      }
    }, 100);

    return function clear() {
      clearInterval(timer);
    };
  });
}
