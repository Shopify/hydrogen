import { json } from "@remix-run/server-runtime";
import { CacheLong, generateCacheControlHeader } from "../cache/strategies";
import { getPaginationVariables } from "../pagination/Pagination";
import { getSelectedProductOptions } from "../product/VariantSelector";
import { type Storefront } from "../storefront";

const CACHE_LONG = generateCacheControlHeader(CacheLong());

export async function analyticsEventData({
  request,
  storefront,
}: {
  request: Request;
  storefront: Storefront;
}) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const dataType = searchParams.get('eventType');
  const handle = searchParams.get('eventHandle');

  if (dataType === 'product' && handle) {
    const selectedOptions = getSelectedProductOptions(request);
    const data = await storefront.query(PRODUCT_QUERY, {
      variables: {
        handle,
        selectedOptions,
      },
      cache: storefront.CacheLong(),
    });

    return json(data, {
      headers: {
        'cache-control': CACHE_LONG,
      },
    });
  }

  if (dataType === 'collection' && handle) {
    const paginationVariables = getPaginationVariables(request, {
      pageBy: 8,
    });
    const data = await storefront.query(COLLECTION_QUERY, {
      variables: {
        handle,
        ...paginationVariables
      },
      cache: storefront.CacheLong(),
    });

    return json(data, {
      headers: {
        'cache-control': CACHE_LONG,
      },
    });
  }

  return json({}, {
    headers: {
      'cache-control': CACHE_LONG,
    },
  });
}

const PRODUCT_QUERY = `#graphql
  query EventDataProduct(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    localization {
      country {
        currency {
          isoCode
        }
      }
    }
    product(handle: $handle) {
      id
      title
      vendor
      selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
        id
        title
        price {
          amount
          currencyCode
        }
      }
    }
  }
` as const;

const COLLECTION_QUERY = `#graphql
  query EventDataCollection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
    }
  }
` as const;
