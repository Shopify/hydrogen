import {Form} from '@remix-run/react';
import {Locale, SUPPORTED_LOCALES, useSelectedLocale} from '../lib/i18n';
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
          <LocaleLink
            key={`locale-${locale.language}-${locale.country}`}
            locale={locale}
          />
        ))}
      </div>
    </details>
  );
}

const LocaleLink = ({locale}: {locale: Locale}) => {
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
      <input type="hidden" name="redirectTo" value={locale.pathPrefix} />
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
};
