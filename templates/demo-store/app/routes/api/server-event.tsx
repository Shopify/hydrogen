import {type ActionArgs} from '@shopify/hydrogen-remix';
import invariant from 'tiny-invariant';
import {sentToShopifyAnalytics} from '~/lib/analytics/shopify-analytics';
import {getAnalyticDataByPageType} from '~/lib/analytics';
import type {RequestData} from '~/lib/analytics/types';

export async function action({request, context}: ActionArgs) {
  const {session} = context;
  const [cartId, customerAccessToken] = await Promise.all([
    session.get('cartId'),
    session.get('customerAccessToken'),
  ]);
  const requestData = await request.json();

  // console.log('server-event', requestData);

  // payload
  const analyticsData = await getAnalyticDataByPageType({
    payload: requestData.payload,
    storefront: context.storefront,
    queries: ANALYTICS_QUERIES,
  });

  sentToShopifyAnalytics({
    request,
    requestData: requestData as RequestData,
    analyticsData: formatAnalyticsData(analyticsData),
  });

  return new Response(
    JSON.stringify({
      ga: ['event', 'page_view'],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}

function formatAnalyticsData(data: any) {
  const formattedData: any = {};

  if (data?.shop?.id) {
    formattedData.shopId = data.shop.id;
  }

  if (data?.localization?.country?.currency?.isoCode) {
    formattedData.currency = data.localization.country.currency.isoCode;
  }

  if (data?.product) {
    const {variants, selectedVariant, ...restOfData} = data.product;
    formattedData.product = {
      ...restOfData,
      variant: selectedVariant || variants.nodes[0],
    };
  }

  return formattedData;
}

// Queries supplied by developer
const SHOP_QUERY = `#graphql
  query shopAnalytics($country: CountryCode = ZZ)
  @inContext(country: $country) {
    shop {
      id
    }
    localization {
      country {
        currency {
          isoCode
        }
      }
    }
  }
`;

const PRODUCT_QUERY = `#graphql
  fragment ProductVariantFragment on ProductVariant {
    id
    price {
      amount
      currencyCode
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
  query ProductAnalytics(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
        ...ProductVariantFragment
      }
      variants(first: 1) {
        nodes {
          ...ProductVariantFragment
        }
      }
    }
  }
`;

const ANALYTICS_QUERIES = {
  shop: SHOP_QUERY,
  product: PRODUCT_QUERY,
};
