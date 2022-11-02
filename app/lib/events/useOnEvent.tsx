import {useLocation} from '@remix-run/react';
import {useEffect} from 'react';
import {HydrogenEvent} from '~/lib/events';
import {getEventPayload} from './utils';
import {useCart} from '~/hooks/useCart';
import {useCountries} from '~/hooks/useCountries';
import {useCustomer} from '~/hooks/useCustomer';
import type {BaseEventPayload} from './PubSub';

interface UseOnEventConfig {
  // user-defined events
  [key: string]: (payload: BaseEventPayload | unknown) => void;
}

interface CustomEventPayload {
  type: string;
  payload?: object;
}

export function useOnEvent(config: UseOnEventConfig) {
  const cart = useCart();
  const customer = useCustomer();
  const countries = useCountries();
  const location = useLocation();

  useEffect(() => {
    function anyEventCallback({
      type,
      payload: eventPayload,
    }: CustomEventPayload) {
      if (!type || typeof type !== 'string') return;
      const callback = config?.[type.trim()];
      if (typeof callback === 'undefined') return;
      const payload = getEventPayload(
        cart,
        customer,
        countries,
        location,
      ) as BaseEventPayload;

      if (typeof eventPayload === 'object') {
        payload.data = {...payload.data, ...eventPayload};
      }
      callback(payload);
    }

    HydrogenEvent.subscribe('*', anyEventCallback);
    return () => {
      HydrogenEvent.unsubscribe('*', anyEventCallback);
    };
  }, [cart, customer, countries, location, config]);
}
