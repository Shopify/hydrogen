import {
  type ActionFunction,
  redirect,
} from '@hydrogen/remix';
import {CountryCode, LanguageCode} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import invariant from 'tiny-invariant';
import { updateCartBuyerIdentity } from '~/data';
import { getSession } from '~/lib/session.server';

export const action: ActionFunction = async ({request, context}) => {

  const [session, formData] = await Promise.all([
    getSession(request, context),
    new URLSearchParams(await request.text()),
  ]);

  const languageCode = formData.get('language') as LanguageCode;
  invariant(languageCode, 'Missing language');

  const countryCode = formData.get('country') as CountryCode;
  invariant(countryCode, 'Missing country');

  let newPrefixPath = '';
  const path = formData.get('path');
  const hreflang = `${languageCode}-${countryCode}`;

  if (hreflang !== 'EN-US') newPrefixPath = `/${hreflang.toLowerCase()}`;

  let cartId = await session.get('cartId');

  // Update cart buyer's country code if we have a cart id
  if (cartId) {
    await updateCartBuyerIdentity({
      cartId,
      buyerIdentity: {
        countryCode,
      },
      locale: {
        country: countryCode,
        language: languageCode,
      },
    });
  }

  return redirect(newPrefixPath + path, 302);
};
