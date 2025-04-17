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

  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const redirectUrl = new URL(
    `${toLocale.pathPrefix || ''}`,
    `${protocol}://${toLocale.host}`,
  ).toString();

  return redirect(redirectUrl, 301);
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
