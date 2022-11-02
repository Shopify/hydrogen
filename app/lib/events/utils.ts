import {type Location} from '@remix-run/react';
import type {
  Cart,
  Customer,
  Country,
} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import type {EventDataCountry, AllowedEventPayloads} from './PubSub';

export function getEventPayload(
  cart: Cart | null,
  customer: Customer | null,
  countries: Country[] | null,
  location: Location,
): AllowedEventPayloads {
  // event page
  const descriptionTag = document.querySelector(
    'meta[name=description]',
  ) as HTMLMetaElement;
  const description = descriptionTag ? descriptionTag.content : '';
  const title = document.title;

  // event country
  const country = getCountryFromBuyerIdentity(cart, countries);

  const payload = {
    event: {
      type: '', // will be set outside
      id: crypto.randomUUID(),
      time: new Date().toISOString(),
    },
    page: {
      url: location,
      title,
      description,
    },
    data: {
      customer,
      cart,
      country,
    },
  };

  return payload;
}

export function getCountryFromBuyerIdentity(
  cart: Cart | null,
  countries: Country[] | null,
): EventDataCountry {
  const defaultCountry: EventDataCountry = {
    isoCode: 'US',
    name: 'United States',
    currency: {
      isoCode: 'USD',
      symbol: '$',
    },
  };

  if (!cart?.buyerIdentity?.countryCode || !countries?.length) {
    return defaultCountry;
  }

  const country = countries.find(
    (country) => country.isoCode === cart.buyerIdentity.countryCode,
  );

  if (!country) {
    return defaultCountry;
  }

  return country;
}
