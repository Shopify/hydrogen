import {defer, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import type {
  ProductVariant,
  Product as ProductType,
  CartLineInput,
} from '@shopify/hydrogen/storefront-api-types';
import {flattenConnection, Money} from '@shopify/hydrogen';
import {CartAction} from '~/lib/cart/components';
import {CartCount} from '~/components';
import {useCart, useFormFetcher} from '~/lib/cart/hooks';

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

  const cart = useCart();
  const flattenedLines = cart ? flattenConnection(cart.lines) : undefined;

  // find the line in the cart that matches the selected variant
  const selectedLine = flattenedLines?.find(
    (line) => line.merchandise.id === selectedVariant.id,
  );

  const currentQuantity = selectedLine?.quantity ?? 0;

  const fetcher = useFormFetcher('123');

  const input = fetcher?.submission?.formData.get('lines')?.toString();
  const parsedInput = input
    ? (JSON.parse(input) as CartLineInput[])
    : undefined;

  const selectedVariantFound = parsedInput?.find(
    (line) => line.merchandiseId === selectedVariant.id,
  );

  const futureAddQuantity = selectedVariantFound?.quantity;

  const quantity = futureAddQuantity
    ? currentQuantity + futureAddQuantity
    : currentQuantity;

  const lines = [
    {
      merchandiseId: selectedVariant.id,
      quantity: 1,
    },
  ];

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
            <div>You have {quantity} of this product in your cart</div>
            <div className="Price Heading--2">
              <Money
                data={{
                  amount: selectedVariant.price.amount,
                  currencyCode: selectedVariant.price.currencyCode,
                }}
              />
            </div>

            <CartAction action="LINES_ADD" inputs={lines}>
              {() => {
                return (
                  <>
                    <input type="hidden" name="form-id" value={'123'} />
                    <button>Add to cart</button>
                  </>
                );
              }}
            </CartAction>
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
