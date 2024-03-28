// https://shopify.dev/docs/custom-storefronts/oxygen/worker-runtime-apis#custom-headers
export const OXYGEN_HEADERS_MAP = {
  ip: {name: 'oxygen-buyer-ip', defaultValue: '127.0.0.1'},
  longitude: {name: 'oxygen-buyer-longitude', defaultValue: '-122.40140'},
  latitude: {name: 'oxygen-buyer-latitude', defaultValue: '37.78855'},
  continent: {name: 'oxygen-buyer-continent', defaultValue: 'NA'},
  country: {name: 'oxygen-buyer-country', defaultValue: 'US'},
  region: {name: 'oxygen-buyer-region', defaultValue: 'California'},
  regionCode: {name: 'oxygen-buyer-region-code', defaultValue: 'CA'},
  city: {name: 'oxygen-buyer-city', defaultValue: 'San Francisco'},
  isEuCountry: {name: 'oxygen-buyer-is-eu-country', defaultValue: ''},
  timezone: {
    name: 'oxygen-buyer-timezone',
    defaultValue: 'America/Los_Angeles',
  },

  // Not documented but available in Oxygen:
  deploymentId: {name: 'oxygen-buyer-deployment-id', defaultValue: 'local'},
  shopId: {name: 'oxygen-buyer-shop-id', defaultValue: 'development'},
  storefrontId: {
    name: 'oxygen-buyer-storefront-id',
    defaultValue: 'development',
  },
} as const;
