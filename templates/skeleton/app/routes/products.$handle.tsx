import {Suspense} from 'react';
import {defer, redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {Await, Link, useLoaderData, type MetaFunction} from '@remix-run/react';
import type {ProductFragment} from 'storefrontapi.generated';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
} from '@shopify/hydrogen';
import type {ProductVariant, SelectedOption} from '@shopify/hydrogen/storefront-api-types';
import {getVariantUrl} from '~/lib/variants';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
import { decodeOptionValues } from '~/lib/optionValueDecoder';
import { AddToCartButton } from '~/components/AddToCartButton';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: `Hydrogen | ${data?.product.title ?? ''}`}];
};

export async function loader(args: LoaderFunctionArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return defer({...deferredData, ...criticalData});
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({
  context,
  params,
  request,
}: LoaderFunctionArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product.selectedVariant) {
    product.selectedVariant = product.firstAvailableVariant;
  }

  if (!product.selectedVariant) {
    product.selectedVariant = product.variants.nodes[0];
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
function loadDeferredData({context, params}: LoaderFunctionArgs) {
  // In order to show which variants are available in the UI, we need to query
  // all of them. But there might be a *lot*, so instead separate the variants
  // into it's own separate query that is deferred. So there's a brief moment
  // where variant options might show as available when they're not, but after
  // this deffered query resolves, the UI will update.
  const variants = context.storefront
    .query(VARIANTS_QUERY, {
      variables: {handle: params.handle!},
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

function mapSelectedProductOption(options: Pick<SelectedOption, "name" | "value">[]) {
  return Object.assign({}, ...options.map((key) => {
    return {[key.name]: key.value};
  }));
}

function mapAdjacentVariants(variants: ProductVariant[]) {
  return Object.assign({}, ...variants.map((variant) => {
    const keyName = mapSelectedProductOption(variant.selectedOptions || []);
    return {[JSON.stringify(keyName)]: variant};
  }));
}

function mapOptionExistence(encodedVariantExistence: string, options: ProductFragment['options']) {
  const validOptions: string[] = [];
  const decodedVariantExistence = decodeOptionValues(encodedVariantExistence);
  // console.log('decodedVariantExistenceMap', decodedVariantExistence);
  decodedVariantExistence.forEach((optionSet) => {
    const decodedOption = Object.assign({}, ...optionSet.map((option, index) => {
      const productOption = options[index];
      return {[productOption.name]: productOption.optionValues[option].name};
    }));
    validOptions.push(JSON.stringify(decodedOption));
  });
  return validOptions;
}

function useProductOptions(product : ProductFragment) {
  const variants = mapAdjacentVariants([
    product.selectedVariant,
    ...product.adjacentVariants,
  ]);

  const selectedOptions = mapSelectedProductOption(product.selectedVariant?.selectedOptions || []);
  const decodedVariantExistence = mapOptionExistence(product.encodedVariantExistence, product.options);

  console.log('encodedVariantExistence', product.encodedVariantExistence);

  return product.options.map((option) => {
    return {
      ...option,
      optionValues: option.optionValues.map((value) => {
        const targetOption = {...selectedOptions};
        targetOption[option.name] = value.name;
        const targetKey = JSON.stringify(targetOption);
        const variant = variants[targetKey];
        const searchParams = new URLSearchParams(targetOption);
        const link = variant && `${variant?.product?.handle}?${searchParams.toString()}`;

        return {
          ...value,
          variant,
          link,
          selected: selectedOptions[option.name] === value.name,
          exists: decodedVariantExistence.includes(targetKey),
          available: variant?.availableForSale || false,
        };
      }),
    };
  });

}

export default function Product() {
  const {product, variants} = useLoaderData<typeof loader>();
  const selectedVariant = useOptimisticVariant(
    product.selectedVariant,
    variants,
  );

  const {title, descriptionHtml} = product;
  const productOptions = useProductOptions(product);

  console.log('adjacentVariants', product.adjacentVariants);
  console.log('productOptions', productOptions);

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

        {productOptions.map((option) => (
          <div className="product-options" key={option.name}>
            <h5>{option.name}</h5>
            <div className="product-options-grid">
              {option.optionValues.map((value) => {
                const {name, link, selected, exists, available} = value;
                if (exists && link) {
                  return (
                    <Link
                      className="product-options-item"
                      key={option.name + name}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={`/products/${link}`}
                      style={{
                        border: selected ? '1px solid black' : '1px solid transparent',
                        opacity: available ? 1 : 0.3,
                      }}
                    >
                      {name}
                    </Link>
                  );
                } else {
                  return (
                    <div
                      className="product-options-item"
                      key={option.name + name}
                      style={{
                        border: '1px solid transparent',
                        opacity: 0.05,
                      }}
                    >
                      {name}
                    </div>
                  );
                }
              })}
            </div>
            <br />
          </div>
        ))}
        <br />
      <AddToCartButton
        disabled={!selectedVariant || !selectedVariant.availableForSale}
        onClick={() => {
          open('cart');
        }}
        lines={[
          {
            merchandiseId: selectedVariant.id,
            quantity: 1,
            selectedVariant,
          },
        ]}
      >
        {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
      </AddToCartButton>

        <br />
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
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

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
    encodedVariantExistence
    selectedVariant: variantBySelectedOptions(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      ...ProductVariant
    }
    firstAvailableVariant {
      ...ProductVariant
    }
    variants(first: 1) {
      nodes {
        ...ProductVariant
      }
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

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

const VARIANTS_QUERY = `#graphql
  ${PRODUCT_VARIANTS_FRAGMENT}
  query ProductVariants(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...ProductVariants
    }
  }
` as const;
