import {
  CountryCode,
  LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';
import {type ActionFunction, redirect} from '@shopify/hydrogen-remix';
import invariant from 'tiny-invariant';
import {updateCartBuyerIdentity} from '~/data';
import {countries} from '~/data/countries';

export const action: ActionFunction = async ({request, context}) => {
  const {session} = context;
  const formData = await request.formData();

  const languageCode = formData.get('language') as LanguageCode;
  invariant(languageCode, 'Missing language');

  const countryCode = formData.get('country') as CountryCode;
  invariant(countryCode, 'Missing country');

  let newPrefixPath = '';
  const path = formData.get('path');
  const hreflang = `${languageCode}-${countryCode}`;
  const defaultLocale = countries['default'];

  if (hreflang !== `${defaultLocale.language}-${defaultLocale.country}`)
    newPrefixPath = `/${hreflang.toLowerCase()}`;

  const cartId = await session.get('cartId');

  // Update cart buyer's country code if we have a cart id
  if (cartId) {
    await updateCartBuyerIdentity(context, {
      cartId,
      buyerIdentity: {
        countryCode,
      },
    });
  }

  return redirect(newPrefixPath + path, 302);
};
