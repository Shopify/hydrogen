import {Suspense} from 'react';
import {defer, redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {Await, useLoaderData, type MetaFunction} from '@remix-run/react';
import type {ProductFragment} from 'storefrontapi.generated';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
} from '@shopify/hydrogen';
import type {SelectedOption} from '@shopify/hydrogen/storefront-api-types';
import {getVariantUrl} from '~/lib/variants';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
import {QuantityRules, hasQuantityRules} from '~/components/QuantityRules';
import {PriceBreaks} from '~/components/PriceBreaks';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: `Hydrogen | ${data?.product.title ?? ''}`}];
};

/***********************************************/
/**********  EXAMPLE UPDATE STARTS  ************/
type BuyerVariables = {
  buyer: {
    companyLocationId: string;
    customerAccessToken: string;
  };
} | {};
/**********   EXAMPLE UPDATE END   *************/
/***********************************************/

export async function loader(args: LoaderFunctionArgs) {

  /***********************************************/
  /**********  EXAMPLE UPDATE STARTS  ************/
  const buyer = await args.context.customerAccount.UNSTABLE_getBuyer();

  const buyerVariables: BuyerVariables =
    buyer?.companyLocationId && buyer?.customerAccessToken
      ? {
          buyer: {
            companyLocationId: buyer.companyLocationId,
            customerAccessToken: buyer.customerAccessToken,
          },
        }
      : {};

  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args, buyerVariables);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args, buyerVariables);
  /**********   EXAMPLE UPDATE END   *************/
  /***********************************************/

  return defer({...deferredData, ...criticalData});
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
/***********************************************/
/**********  EXAMPLE UPDATE STARTS  ************/
async function loadCriticalData({
  context,
  params,
  request,
}: LoaderFunctionArgs, buyerVariables: BuyerVariables) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {
        handle,
        selectedOptions: getSelectedProductOptions(request),
        ...buyerVariables,
      },
      cache: storefront.CacheNone(),
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);
/**********   EXAMPLE UPDATE END   *************/
/***********************************************/

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  const firstVariant = product.variants.nodes[0];
  const firstVariantIsDefault = Boolean(
    firstVariant.selectedOptions.find(
      (option: SelectedOption) =>
        option.name === 'Title' && option.value === 'Default Title',
    ),
  );

  if (firstVariantIsDefault) {
    product.selectedVariant = firstVariant;
  } else {
    // if no selected variant was returned from the selected options,
    // we redirect to the first variant's url with it's selected options applied
    if (!product.selectedVariant) {
      throw redirectToFirstVariant({product, request});
    }
  }

  return {
    product,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
  /***********************************************/
  /**********  EXAMPLE UPDATE STARTS  ************/
function loadDeferredData({context, params}: LoaderFunctionArgs, buyerVariables: BuyerVariables) {
  const {storefront} = context;

  // In order to show which variants are available in the UI, we need to query
  // all of them. But there might be a *lot*, so instead separate the variants
  // into it's own separate query that is deferred. So there's a brief moment
  // where variant options might show as available when they're not, but after
  // this deferred query resolves, the UI will update.
  const variants = context.storefront
    .query(VARIANTS_QUERY, {
      variables: {handle: params.handle!, ...buyerVariables},
      cache: storefront.CacheNone(),
    })
    .catch((error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  return {
    variants,
  };
}
/**********   EXAMPLE UPDATE END   *************/
/***********************************************/

function redirectToFirstVariant({
  product,
  request,
}: {
  product: ProductFragment;
  request: Request;
}) {
  const url = new URL(request.url);
  const firstVariant = product.variants.nodes[0];

  return redirect(
    getVariantUrl({
      pathname: url.pathname,
      handle: product.handle,
      selectedOptions: firstVariant.selectedOptions,
      searchParams: new URLSearchParams(url.search),
    }),
    {
      status: 302,
    },
  );
}

export default function Product() {
  const {product, variants} = useLoaderData<typeof loader>();
  const selectedVariant = useOptimisticVariant(
    product.selectedVariant,
    variants,
  );

  const {title, descriptionHtml} = product;

  return (
    <div className="product">
      <ProductImage image={selectedVariant?.image} />
      <div className="product-main">
        <h1>{title}</h1>
        <ProductPrice
          price={selectedVariant?.price}
          compareAtPrice={selectedVariant?.compareAtPrice}
        />
        <br />
        <Suspense
          fallback={
            <ProductForm
              product={product}
              selectedVariant={selectedVariant}
              variants={[]}
              /***********************************************/
              /**********  EXAMPLE UPDATE STARTS  ************/
              quantity={1}
              /**********   EXAMPLE UPDATE END   ************/
              /***********************************************/
            />
          }
        >
          <Await
            errorElement="There was a problem loading product variants"
            resolve={variants}
          >
            {(data) => (
              <ProductForm
                product={product}
                selectedVariant={selectedVariant}
                variants={data?.product?.variants.nodes || []}
                /***********************************************/
                /**********  EXAMPLE UPDATE STARTS  ************/
                quantity={selectedVariant?.quantityRule?.increment || 1}
                /**********   EXAMPLE UPDATE END   ************/
                /***********************************************/
              />
            )}
          </Await>
        </Suspense>
        <br />
        {
          /***********************************************/
          /**********  EXAMPLE UPDATE STARTS  ************/
          hasQuantityRules(selectedVariant?.quantityRule) ? (
            <QuantityRules
              maximum={selectedVariant?.quantityRule.maximum}
              minimum={selectedVariant?.quantityRule.minimum}
              increment={selectedVariant?.quantityRule.increment}
            />
          ) : null
        }
        <br />
        {
          selectedVariant?.quantityPriceBreaks?.nodes &&
          selectedVariant?.quantityPriceBreaks?.nodes?.length > 0 ? (
            <PriceBreaks
              priceBreaks={selectedVariant?.quantityPriceBreaks?.nodes}
            />
          ) : null
          /**********   EXAMPLE UPDATE END   ************/
          /***********************************************/
        }
        <br />
        <p>
          <strong>Description</strong>
        </p>
        <br />
        <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
        <br />
      </div>
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

/***********************************************/
/**********  EXAMPLE UPDATE STARTS  ************/
const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    quantityRule {
      maximum
      minimum
      increment
    }
    quantityPriceBreaks(first: 5) {
      nodes {
        minimumQuantity
        price {
          amount
          currencyCode
        }
      }
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;
/**********   EXAMPLE UPDATE END   ************/
/***********************************************/

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    options {
      name
      optionValues {
        name
      }
    }
    selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    variants(first: 1) {
      nodes {
        ...ProductVariant
      }
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

/***********************************************/
/**********  EXAMPLE UPDATE STARTS  ************/
const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $buyer: BuyerInput
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language, buyer: $buyer) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;
/**********   EXAMPLE UPDATE END   ************/
/***********************************************/

const PRODUCT_VARIANTS_FRAGMENT = `#graphql
  fragment ProductVariants on Product {
    variants(first: 250) {
      nodes {
        ...ProductVariant
      }
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

/***********************************************/
/**********  EXAMPLE UPDATE STARTS  ************/
const VARIANTS_QUERY = `#graphql
  ${PRODUCT_VARIANTS_FRAGMENT}
  query ProductVariants(
    $country: CountryCode
    $buyer: BuyerInput
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language, buyer: $buyer) {
    product(handle: $handle) {
      ...ProductVariants
    }
  }
` as const;
/**********   EXAMPLE UPDATE END   ************/
/***********************************************/
