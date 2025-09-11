import {Form, useLocation} from 'react-router';
import type {Locale} from '../lib/i18n';
import {
  SUPPORTED_LOCALES,
  useSelectedLocale,
  getPathWithoutLocale,
} from '../lib/i18n';
import {CartForm} from '@shopify/hydrogen';

export function CountrySelector() {
  const selectedLocale = useSelectedLocale();

  const label =
    selectedLocale != null
      ? `${selectedLocale.language}-${selectedLocale.country}`
      : 'Country';

  return (
    <details style={{position: 'relative', cursor: 'pointer'}}>
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
        {SUPPORTED_LOCALES.map((locale) => (
          <LocaleForm
            key={`locale-${locale.language}-${locale.country}`}
            locale={locale}
          />
        ))}
      </div>
    </details>
  );
}

function LocaleForm({locale}: {locale: Locale}) {
  const {pathname, search} = useLocation();
  const selectedLocale = useSelectedLocale();

  // Get the new path with the new locale, preserving the current path
  const pathWithoutLocale = getPathWithoutLocale(pathname, selectedLocale);
  const newPath = `${locale.pathPrefix.replace(/\/+$/, '')}${pathWithoutLocale}${search}`;

  const action = `${locale.pathPrefix.replace(/\/+$/, '')}/cart`;
  const variables = {
    action: CartForm.ACTIONS.BuyerIdentityUpdate,
    inputs: {
      buyerIdentity: {
        countryCode: locale.country.toUpperCase(),
      },
    },
  };

  return (
    <Form method="POST" action={action}>
      <input type="hidden" name="redirectTo" value={newPath} />
      <input
        type="hidden"
        name="cartFormInput"
        value={JSON.stringify(variables)}
      />
      <button type="submit">
        {locale.language}-{locale.country}
      </button>
    </Form>
  );
}
