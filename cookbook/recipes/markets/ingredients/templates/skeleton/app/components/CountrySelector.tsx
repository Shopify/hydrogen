import {Form, useMatches, useLocation, useFetcher} from '@remix-run/react';
import {useCallback, useEffect, useState} from 'react';
import type {Countries, Locale} from '~/data/countries';

interface RootData {
  selectedLocale: Locale;
}

export function CountrySelector() {
  const [root] = useMatches();
  const selectedLocale = (root.data as RootData).selectedLocale;
  const {pathname, search} = useLocation();

  const [countries, setCountries] = useState<Record<string, Locale> | null>(
    null,
  );

  // Get available countries list
  useEffect(() => {
    fetch('/api/countries')
      .then((res) => res.json())
      .then((data) => setCountries(data as Countries));
  }, []);

  const strippedPathname =
    selectedLocale.pathPrefix != null
      ? pathname.replace(selectedLocale.pathPrefix, '')
      : pathname;

  const [open, setOpen] = useState(false);
  const toggleOpen = useCallback(() => setOpen((open) => !open), []);

  return (
    <div>
      <button onClick={toggleOpen}>{selectedLocale.label}</button>
      <div style={{position: 'relative'}}>
        {open && countries != null && (
          <CountryPicker
            countries={countries}
            selectedLocale={selectedLocale}
            strippedPathname={strippedPathname}
            search={search}
          />
        )}
      </div>
    </div>
  );
}

function CountryPicker(props: {
  countries: Record<string, Locale>;
  selectedLocale: Locale;
  strippedPathname: string;
  search: string;
}) {
  const {countries, selectedLocale, strippedPathname, search} = props;
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 100,
        padding: 4,
        borderRadius: 2,
        boxShadow: '0 0 10px 0 rgba(0, 0, 0, .2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: '220px',
      }}
    >
      {Object.keys(countries).map((countryKey) => {
        const locale = countries[countryKey];
        const hreflang = `${locale.language}-${locale.country}`;

        return (
          <Form
            method="post"
            action="/locale"
            key={hreflang}
            style={{display: 'flex'}}
          >
            <input
              type="hidden"
              name="currentLanguage"
              value={selectedLocale.language}
            />
            <input
              type="hidden"
              name="currentCountry"
              value={selectedLocale.country}
            />
            <input type="hidden" name="language" value={locale.language} />
            <input type="hidden" name="country" value={locale.country} />
            <input
              type="hidden"
              name="path"
              value={`${strippedPathname}${search}`}
            />
            <button type="submit" style={{flex: 1, textAlign: 'left'}}>
              {locale.label}
            </button>
          </Form>
        );
      })}
    </div>
  );
}
