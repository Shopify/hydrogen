import {Link} from '@remix-run/react';
import {locales, useSelectedLocale} from '../lib/i18n';

export function CountrySelector() {
  const selectedLocale = useSelectedLocale();

  const label =
    selectedLocale != null
      ? `${selectedLocale.country}-${selectedLocale.language}`
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
        {locales.map((locale) => (
          <Link
            key={locale.country}
            reloadDocument={true}
            to={locale.pathPrefix}
          >
            {locale.language}-{locale.country}
          </Link>
        ))}
      </div>
    </details>
  );
}
