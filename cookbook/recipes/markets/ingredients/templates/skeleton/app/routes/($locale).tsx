import type {
  CountryCode,
  LanguageCode,
  CartBuyerIdentityInput,
  Cart,
} from '@shopify/hydrogen/storefront-api-types';
import {
  redirect,
  type AppLoadContext,
  type ActionFunction,
  LoaderFunctionArgs,
} from '@shopify/remix-oxygen';
import invariant from 'tiny-invariant';
import {countries} from '~/data/countries';

export async function loader(_: LoaderFunctionArgs) {
  return {};
}

export const action: ActionFunction = async ({request, context}) => {
  const {session} = context;
  const formData = await request.formData();

  // Make sure the form request is valid
  const languageCode = formData.get('language') as LanguageCode;
  invariant(languageCode, 'Missing language');

  const countryCode = formData.get('country') as CountryCode;
  invariant(countryCode, 'Missing country');

  const currentLanguage = formData.get('currentLanguage') as LanguageCode;
  invariant(currentLanguage, 'Missing current language');

  const currentCountry = formData.get('currentCountry') as CountryCode;
  invariant(currentCountry, 'Missing current country');

  // Determine where to redirect to relative to where user navigated from
  // ie. hydrogen.shop/collections -> ca.hydrogen.shop/collections
  const path = formData.get('path');
  const key = `${languageCode}-${countryCode}`.toLowerCase();
  const toLocale = countries[key] ?? countries.default;

  const cartId = await session.get('cartId');

  // Update cart buyer's country code if there is a cart id
  if (cartId) {
    await updateCartBuyerIdentity(context, {
      cartId,
      buyerIdentity: {
        countryCode,
      },
    });
  }

  // if the user is in a product page with a localized handle, we need to redirect to the localized handle for the new locale
  let pathString = path?.toString();
  if (pathString?.includes('/products/')) {
    // TODO naive implementation, should take into account variants, different urls, etc.
    const productHandle = pathString.split('/products/')[1].split('?')[0];
    const vars = {
      handle: productHandle,
      language: currentLanguage,
      country: currentCountry,
    };
    const productByHandle = await context.storefront.query(PRODUCT_ID_QUERY, {
      variables: vars,
    });
    if (productByHandle?.product?.id != null) {
      const vars = {
        id: productByHandle.product.id,
        language: languageCode,
        country: countryCode,
      };
      const productByID = await context.storefront.query(PRODUCT_HANDLE_QUERY, {
        variables: vars,
      });
      pathString = `/products/${productByID.product?.handle}`;
    }
  }

  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const redirectUrl = new URL(
    `${toLocale.pathPrefix || ''}${pathString}`,
    `${protocol}://${toLocale.host}`,
  ).toString();

  return redirect(redirectUrl, 302);
};

async function updateCartBuyerIdentity(
  {storefront}: AppLoadContext,
  {
    cartId,
    buyerIdentity,
  }: {
    cartId: string;
    buyerIdentity: CartBuyerIdentityInput;
  },
) {
  const data = await storefront.mutate<{
    cartBuyerIdentityUpdate: {cart: Cart};
  }>(UPDATE_CART_BUYER_COUNTRY, {
    variables: {
      cartId,
      buyerIdentity,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return data.cartBuyerIdentityUpdate.cart;
}

const UPDATE_CART_BUYER_COUNTRY = `#graphql
  mutation CartBuyerIdentityUpdate(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
  ) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        id
      }
    }
  }
`;

const PRODUCT_ID_QUERY = `#graphql
  query ProductId(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
    }
  }
`;

const PRODUCT_HANDLE_QUERY = `#graphql
  query ProductHandle(
    $id: ID!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(id: $id) {
      handle
    }
  }
` as const;
