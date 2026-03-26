import type {ShopAnalytics} from './types';

type StorefrontClientLike = {
  query: (...args: any[]) => Promise<any>;
  CacheLong?: () => unknown;
};

type ShopAnalyticsProps = {
  storefront: StorefrontClientLike;
  publicStorefrontId?: string;
};

const SHOP_QUERY = `#graphql
  query ShopData(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    shop {
      id
    }
    localization {
      country {
        currency {
          isoCode
        }
      }
      language {
        isoCode
      }
    }
  }
` as const;

export async function getShopAnalytics({
  storefront,
  publicStorefrontId = '0',
}: ShopAnalyticsProps): Promise<ShopAnalytics | null> {
  const cacheOptions = storefront.CacheLong
    ? {cache: storefront.CacheLong()}
    : {};

  return storefront
    .query(SHOP_QUERY, cacheOptions)
    .then(({shop, localization}: {shop: {id: string}; localization: any}) => ({
      shopId: shop.id,
      acceptedLanguage: localization.language.isoCode,
      currency: localization.country.currency.isoCode,
      hydrogenSubchannelId: publicStorefrontId,
    }));
}
