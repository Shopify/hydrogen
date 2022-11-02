import {RouteMatch, useLocation, useMatches} from '@remix-run/react';
import {useRef, useEffect} from 'react';
import {HydrogenEvent} from '~/lib/events';
import {getEventPayload} from './utils';
import {useCart} from '~/hooks/useCart';
import {useCountries} from '~/hooks/useCountries';
import {useCustomer} from '~/hooks/useCustomer';
import type {BaseEventPayload} from './PubSub';
import {Customer} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import event from './PubSub';

interface UseOnEventConfig {
  login: (payload: BaseEventPayload) => void;
  register: (payload: BaseEventPayload) => void;
}

interface CustomEventPayload {
  type: string;
  payload?: any;
}

export function useOnCustomer(config: UseOnEventConfig) {
  const cart = useCart();
  const customer = useCustomer();
  const countries = useCountries();
  const location = useLocation();
  const [, route] = useMatches();
  const prevCustomer = useRef<Customer | null>(customer ?? null);
  const init = useRef<boolean>(false);

  // listen to customer events
  useEffect(() => {
    if (init.current) return;
    init.current = true;
    event.on('login', (payload) => {
      const callback = config?.login;
      if (typeof callback === 'function') {
        callback(payload);
      }
    });
    event.on('register', (payload) => {
      const callback = config?.register;
      if (typeof callback === 'function') {
        callback(payload);
      }
    });
  }, [config]);

  // emit customer events
  useEffect(() => {
    const action = getCustomerAction(route);
    switch (true) {
      case action.loggedIn: {
        const payload = getEventPayload(
          cart,
          customer,
          countries,
          location,
        ) as BaseEventPayload;
        event.emit('login', payload);
        break;
      }
      case action.registered: {
        const payload = getEventPayload(
          cart,
          customer,
          countries,
          location,
        ) as BaseEventPayload;
        event.emit('register', payload);
        break;
      }
      default: {
        // unsupported action
      }
    }

    prevCustomer.current = customer;
  }, [cart, route, customer, countries, location, config]);
}

function getCustomerAction(route: RouteMatch) {
  const isAccount = Boolean(route?.handle?.isAccountRoute);

  return {
    loggedIn: Boolean(isAccount && route?.data?.event?.loggedIn),
    registered: Boolean(isAccount && route?.data?.event?.registered),
  };
}
