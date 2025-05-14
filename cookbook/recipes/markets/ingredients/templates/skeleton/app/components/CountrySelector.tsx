import {Link, useFetcher} from '@remix-run/react';
import {DEFAULT_LOCALE, Locale, useSelectedLocale} from '../lib/i18n';
import {CartForm} from '@shopify/hydrogen';
import {useCallback, useEffect, useState} from 'react';

export function CountrySelector() {
  const selectedLocale = useSelectedLocale();

  const label =
    selectedLocale != null
      ? `${selectedLocale.language}-${selectedLocale.country}`
      : 'Country';

  return (
    <details style={{position: 'relative'}}>
      <summary>{label}</summary>
      <div
        style={{
          position: 'absolute',
          background: 'white',
          width: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: 10,
          border: '1px solid #ccc',
          borderRadius: 4,
          boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
        }}
      >
        <LocaleLink locale={DEFAULT_LOCALE} />
        <LocaleLink
          locale={{country: 'CA', language: 'EN', pathPrefix: '/EN-CA'}}
        />
        <LocaleLink
          locale={{country: 'CA', language: 'FR', pathPrefix: '/FR-CA'}}
        />
        <LocaleLink
          locale={{country: 'FR', language: 'FR', pathPrefix: '/FR-FR'}}
        />
      </div>
    </details>
  );
}

const LocaleLink = ({locale}: {locale: Locale}) => {
  const selectedLocale = useSelectedLocale();
  const fetcher = useFetcher();
  const [updating, setUpdating] = useState(false);

  const updateCartBuyerIdentity = useCallback(() => {
    if (selectedLocale?.pathPrefix === locale.pathPrefix) {
      return;
    }
    setUpdating(true);

    const target = `${locale.pathPrefix.replace(/\/+$/, '')}/cart`;

    const form = new FormData();
    const variables = {
      action: CartForm.ACTIONS.BuyerIdentityUpdate,
      inputs: {
        buyerIdentity: {
          countryCode: locale.country.toUpperCase(),
        },
        redirectTo: target,
      },
    };
    form.append('cartFormInput', JSON.stringify(variables));

    // update the country code in the cart's buyer identity
    fetcher.submit(form, {
      method: 'POST',
      action: target,
    });
  }, [fetcher, locale, selectedLocale]);

  useEffect(() => {
    if (updating && fetcher.state === 'loading') {
      setUpdating(false);
      window.location.replace(locale.pathPrefix);
    }
  }, [fetcher, updating, locale]);

  return (
    <button
      key={locale.country}
      onClick={updateCartBuyerIdentity}
      disabled={updating}
    >
      {locale.language}-{locale.country}
    </button>
  );
};
