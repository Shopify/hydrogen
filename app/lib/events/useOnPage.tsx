import {useLocation, useMatches} from '@remix-run/react';
import {useEffect, useRef} from 'react';
import {useCart} from '~/hooks/useCart';
import {useCountries} from '~/hooks/useCountries';
import {useCustomer} from '~/hooks/useCustomer';
import event from './PubSub';
import {getEventPayload} from './utils';
import type {BaseEventPayload, BaseEventPayloadData} from './PubSub';
import type {Product} from '@shopify/hydrogen-ui-alpha/storefront-api-types';

export interface PageViewProductEventPayload extends BaseEventPayload {
  data: BaseEventPayloadData & {
    product: Product;
  };
}

export interface PageViewSearchResultsPayload extends BaseEventPayload {
  data: BaseEventPayloadData & {
    searchResults: Product[] | [];
    searchTerm: string;
  };
}

interface UseOnPageConfig {
  view?: (payload: BaseEventPayload) => void;
  viewProduct?: (payload: PageViewProductEventPayload) => void;
  viewCart?: (payload: BaseEventPayload) => void;
  viewSearch?: (payload: PageViewSearchResultsPayload) => void;
}

export function useOnPage(config: UseOnPageConfig) {
  const cart = useCart();
  const customer = useCustomer();
  const countries = useCountries();
  const location = useLocation();
  const path = `${location.pathname}${
    location.search ? '?' + location.search : ''
  }`;
  const prevPath = useRef<string | undefined>();
  const [, route] = useMatches();

  useEffect(() => {
    function viewCallback(payload: BaseEventPayload) {
      const callback = config?.view;
      if (typeof callback === 'function') {
        callback(payload);
      }
    }
    event.on('page_view_cart', viewCartCallback);

    function viewProductCallback(payload: PageViewProductEventPayload) {
      const callback = config?.viewProduct;
      if (typeof callback === 'function') {
        callback(payload);
      }
    }
    event.on('page_view_product', viewProductCallback);

    function viewSearchCallback(payload: PageViewSearchResultsPayload) {
      const callback = config?.viewSearch;
      if (typeof callback === 'function') {
        callback(payload);
      }
    }
    event.on('page_view_search_results', viewSearchCallback);

    function viewCartCallback(payload: BaseEventPayload) {
      const callback = config?.viewCart;
      if (typeof callback === 'function') {
        callback(payload);
      }
    }
    event.on('page_view', viewCallback);

    return () => {
      event.off('page_view', viewCallback);
      event.off('page_view_product', viewProductCallback);
      event.off('page_view_search_results', viewSearchCallback);
      event.off('page_view_cart', viewCartCallback);
    };
  }, [config]);

  // emit page view
  useEffect(() => {
    if (path === prevPath.current) return;
    // cache prev visited path
    prevPath.current = path;

    // any route view
    const payload = getEventPayload(
      cart,
      customer,
      countries,
      location,
    ) as BaseEventPayload;
    payload.event.type = 'page_view';
    event.emit('page_view', payload);

    // product, cart, search route views
    switch (true) {
      case route?.handle?.isCartRoute: {
        payload.event.type = 'page_view_cart';
        event.emit('page_view_cart', payload);
        break;
      }
      case route?.handle?.isProductRoute: {
        const payload = getEventPayload(
          cart,
          customer,
          countries,
          location,
        ) as PageViewProductEventPayload;
        payload.event.type = 'page_view_product';
        payload.data.product = route.data.product;
        event.emit('page_view_product', payload);
        break;
      }
      case route?.handle?.isSearchRoute: {
        const payload = getEventPayload(
          cart,
          customer,
          countries,
          location,
        ) as PageViewSearchResultsPayload;
        payload.event.type = 'page_view_search_results';
        payload.data.searchResults = route?.data?.searchResults?.nodes;
        payload.data.searchTerm = route?.data?.searchTerm;
        event.emit('page_view_search_results', payload);
        break;
      }
      default:
    }
  }, [location, path, cart, customer, countries, route]);
}
