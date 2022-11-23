import {
  Form,
  useFetcher,
  useFetchers,
  useLocation,
  useMatches,
} from '@remix-run/react';
import {Heading, Button, IconCheck} from '~/components';
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {Localizations} from '~/lib/type';

export function CountrySelector() {
  const [root] = useMatches();
  const selectedLocale = root.data.selectedLocale;
  const {pathname, search} = useLocation();
  const strippedPathname = pathname.replace(selectedLocale.pathPrefix, '');

  const [countries, setCountries]: [
    Localizations,
    Dispatch<SetStateAction<Localizations>>,
  ] = useState({});

  // Get available countries list
  const fetcher = useFetcher();
  useEffect(() => {
    if (!fetcher.data) {
      fetcher.load('/api/countries');
      return;
    }
    setCountries(fetcher.data);
  }, [countries, fetcher.data]);

  // Close the country selector tag
  const closeRef = useRef<HTMLDetailsElement>(null);
  const fetchers = useFetchers();
  useEffect(() => {
    closeRef.current?.removeAttribute('open');
  }, [fetchers]);

  return (
    <section className="grid gap-4 w-full md:max-w-[335px] md:ml-auto">
      <Heading size="lead" className="cursor-default" as="h3">
        Country
      </Heading>
      <div className="relative">
        <details
          className="border rounded border-contrast/30 dark:border-white open:round-b-none"
          ref={closeRef}
        >
          <summary className="flex items-center justify-between w-full py-3 px-4">
            {selectedLocale.label}
          </summary>
          <div className="overflow-auto border-t py-2 bg-contrast w-full max-h-36">
            {countries &&
              Object.keys(countries).map((countryPath) => {
                const locale = countries[countryPath];
                const isSelected =
                  locale.language === selectedLocale.language &&
                  locale.country === selectedLocale.country;
                const hreflang = `${locale.language}-${locale.country}`;
                return (
                  <Form method="post" action="/locale" key={hreflang}>
                    <input
                      type="hidden"
                      name="language"
                      value={locale.language}
                    />
                    <input
                      type="hidden"
                      name="country"
                      value={locale.country}
                    />
                    <input
                      type="hidden"
                      name="path"
                      value={`${strippedPathname}${search}`}
                    />
                    <Button
                      className="text-contrast dark:text-primary text-contrast dark:text-primary
                      bg-primary dark:bg-contrast w-full p-2 transition rounded flex justify-start
                      items-center text-left cursor-pointer py-2 px-4"
                      type="submit"
                      variant="primary"
                    >
                      {locale.label}
                      {isSelected ? (
                        <span className="ml-2">
                          <IconCheck />
                        </span>
                      ) : null}
                    </Button>
                  </Form>
                );
              })}
          </div>
        </details>
      </div>
    </section>
  );
}
