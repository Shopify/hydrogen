import type {
  CountryCode,
  LanguageCode,
} from '@shopify/hydrogen/storefront-api-types';

export type Locale = {
  language: LanguageCode;
  country: CountryCode;
  label: string;
  host?: string;
  pathPrefix?: string;
};

function hostIfProduction(host: string) {
  return process.env.NODE_ENV === 'development' ? 'localhost:3000' : host;
}

export type Countries = Record<string, Locale>;

export const countries: Countries = {
  default: {
    language: 'EN',
    country: 'US',
    label: 'United States (USD $)',
    host: hostIfProduction('hydrogen.shop'),
  },
  'en-ca': {
    language: 'EN',
    country: 'CA',
    label: 'Canada (EN) (CAD $)',
    host: hostIfProduction('ca.hydrogen.shop'),
    pathPrefix: '/en-ca',
  },
  'fr-ca': {
    language: 'FR',
    country: 'CA',
    label: 'Canada (FR) (CAD $)',
    host: hostIfProduction('ca.hydrogen.shop'),
    pathPrefix: '/fr-ca',
  },
};
