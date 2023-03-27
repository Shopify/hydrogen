import {defer, type LoaderArgs} from '@shopify/remix-oxygen';
import {useFetchers, useLoaderData} from '@remix-run/react';
import type {
  ProductVariant,
  Product as ProductType,
} from '@shopify/hydrogen/storefront-api-types';
import {Money} from '@shopify/hydrogen';
import {CartAction} from '~/lib/cart/components';
import {CartCount} from '~/components';
import {useMatchesData} from '~/lib/cart/hooks';
import {QuantityControls} from '~/components/Cart';
import {AddToCartForm} from '~/components/AddToCartForm';

export async function loader({params, context}: LoaderArgs) {
  const {productHandle} = params;

  const {product} = await context.storefront.query<{
    product: ProductType & {selectedVariant?: ProductVariant};
  }>(PRODUCT_QUERY, {
    variables: {
      handle: productHandle,
      country: context.storefront.i18n?.country,
      language: context.storefront.i18n?.language,
    },
  });

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  return defer({
    product,
    analytics: {
      pageType: 'product',
    },
  });
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();
  const {title, descriptionHtml} = product;
  const firstVariant = product.variants.nodes[0];
  const selectedVariant = product.selectedVariant ?? firstVariant;

  console.log(product);

  return (
    <section className="Product Global__Section">
      <CartCount />
      <div className="Product__Mast">
        <div className="Product__Info" aria-label="Product details">
          <h1 className="Product__Title">{title}</h1>

          <div className="Product__Description">
            <div className="p">
              <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
            </div>
          </div>

          <div className="Product__Cart">
            <div className="Price Heading--2">
              <Money
                data={{
                  amount: selectedVariant.price.amount,
                  currencyCode: selectedVariant.price.currencyCode,
                }}
              />
            </div>

            <AddToCartForm selectedVariant={selectedVariant} />
          </div>
        </div>
      </div>
    </section>
  );
}

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      descriptionHtml
      vendor
      variants(first: 1) {
        nodes {
          id
          title
          price {
            amount
            currencyCode
          }
          availableForSale
        }
      }
    }
  }
`;
