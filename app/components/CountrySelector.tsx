import {Link, useLocation, useParams} from '@remix-run/react';
import {Listbox} from '@headlessui/react';
import {IconCaret, IconCheck} from './Icon';
import {useRef} from 'react';
import {getLocalizationFromLang} from '~/lib/utils';
import {useCountries} from '~/hooks/useCountries';
import {Heading} from '~/components';

export function CountrySelector() {
  const countries = useCountries();
  const closeRef = useRef<HTMLButtonElement>(null);
  const {pathname, search} = useLocation();
  const {lang} = useParams();
  const {language, country} = getLocalizationFromLang(lang);
  const languageIsoCode = language.toLowerCase();
  const strippedPathname = pathname.replace(new RegExp(`^\/${lang}\/`), '/');
  const currentCountry = countries?.find((c) => c.isoCode === country);

  return !countries ? null : (
    <section className="grid gap-4 w-full md:max-w-[335px] md:ml-auto">
      <Heading size="lead" className="cursor-default" as="h3">
        Country
      </Heading>
      <div className="relative">
        <Listbox>
          {({open}) => {
            return (
              <>
                <Listbox.Button
                  ref={closeRef}
                  className={`flex items-center justify-between w-full py-3 px-4 border ${
                    open
                      ? 'rounded-b md:rounded-t md:rounded-b-none'
                      : 'rounded'
                  } border-contrast/30 dark:border-white`}
                >
                  <span>
                    {currentCountry
                      ? `${currentCountry.name} (${currentCountry.currency.isoCode} ${currentCountry.currency.symbol})`
                      : '--'}
                  </span>
                  <IconCaret direction={open ? 'up' : 'down'} />
                </Listbox.Button>

                <Listbox.Options
                  className={`border-t-contrast/30 border-contrast/30 bg-primary dark:bg-contrast absolute bottom-12 z-10 grid
                    h-48 w-full overflow-y-scroll rounded-t border dark:border-white px-2 py-2
                    transition-[max-height] duration-150 sm:bottom-auto md:rounded-b md:rounded-t-none
                    md:border-t-0 md:border-b ${open ? 'max-h-48' : 'max-h-0'}`}
                >
                  {open &&
                    countries.map((country) => {
                      const isSelected =
                        country.isoCode === currentCountry?.isoCode;
                      const countryIsoCode = country.isoCode.toLowerCase();
                      return (
                        <Listbox.Option key={country.isoCode} value={country}>
                          {({active}) => (
                            <Link
                              to={
                                countryIsoCode !== 'us'
                                  ? `/${languageIsoCode}-${countryIsoCode}${strippedPathname}${
                                      search || ''
                                    }`
                                  : `${strippedPathname}${search || ''}`
                              }
                              className={`text-contrast dark:text-primary text-contrast dark:text-primary bg-primary
                              dark:bg-contrast w-full p-2 transition rounded
                              flex justify-start items-center text-left cursor-pointer ${
                                active ? 'bg-primary/10' : null
                              }`}
                              onClick={() => {
                                if (!closeRef?.current) return;
                                closeRef?.current?.click();
                              }}
                            >
                              {country.name} ({country.currency.isoCode}{' '}
                              {country.currency.symbol})
                              {isSelected ? (
                                <span className="ml-2">
                                  <IconCheck />
                                </span>
                              ) : null}
                            </Link>
                          )}
                        </Listbox.Option>
                      );
                    })}
                </Listbox.Options>
              </>
            );
          }}
        </Listbox>
      </div>
    </section>
  );
}
