import type {StorefrontApiClient} from '@shopify/storefront-api-client';
import type {Route} from './+types/_index';
import {getSelectedProductOptions} from '~/lib/getSelectedProductOptions';
import type {SelectedOptionInput} from '~/graphql-types/storefront.types';
import {getProductOptions} from '~/lib/getProductOptions';
import {useSelectedOptionInUrlParam} from '~/lib/useSelectedOptionInUrlParam';
import {Image} from '~/lib/Image';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductForm} from '~/components/ProductForm';
import {Aside} from '~/components/Aside';

export async function loader({context, params, request}: Route.LoaderArgs) {
  const {storefront} = context;
  const {handle} = params;

  if (!handle) {
    throw new Response(null, {status: 404});
  }
  const selectedOptions = getSelectedProductOptions(request);
  console.log('selectedOptions', selectedOptions);

  const product = await getProduct(storefront, handle, selectedOptions);
  console.log('product', product);

  if (!product?.data?.product?.id) {
    throw new Response(null, {status: 404});
  }

  return {
    product: product.data.product,
  };
}

export default function Product({loaderData}: Route.ComponentProps) {
  const product = (loaderData as any).product;

  // TODO: Optimistically selects a variant with given available variant information
  //   const selectedVariant = useOptimisticVariant(
  //     product.selectedOrFirstAvailableVariant,
  //     getAdjacentAndFirstAvailableVariants(product),
  //   );
  const selectedVariant = product.selectedOrFirstAvailableVariant;

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml} = product;

  return (
    <Aside.Provider>
      <div className="product">
        <div className="product-image">
          {selectedVariant.image ? (
            <Image
              alt={selectedVariant.image.altText || 'Product Image'}
              aspectRatio="1/1"
              data={selectedVariant.image}
              key={selectedVariant.image.id}
              sizes="(min-width: 45em) 50vw, 100vw"
            />
          ) : null}
        </div>
        <div className="product-main">
          <h1>{title}</h1>
          <ProductPrice
            price={selectedVariant?.price}
            compareAtPrice={selectedVariant?.compareAtPrice}
          />
          <br />
          <ProductForm
            productOptions={productOptions}
            selectedVariant={selectedVariant}
          />
          <br />
          <br />
          <p>
            <strong>Description</strong>
          </p>
          <br />
          <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
          <br />
        </div>
        {/* <Analytics.ProductView
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
      /> */}
      </div>
    </Aside.Provider>
  );

  //   return (
  //     <div className="product">
  //       <h1>{product.title}</h1>
  //       <p>{product.description}</p>
  //       <div>{product.selectedOrFirstAvailableVariant.title}</div>
  //       <img
  //         src={product.featuredImage.url}
  //         alt={product.featuredImage.altText}
  //       />
  //     </div>
  //   );
}

async function getProduct(
  storefront: StorefrontApiClient,
  handle: string,
  selectedOptions: SelectedOptionInput[],
) {
  return await storefront.request(PRODUCT_QUERY, {
    variables: {handle, selectedOptions},
  });
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
    encodedVariantExistence
    encodedVariantAvailability
    featuredImage {
      id
      url
      altText
    }
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
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
