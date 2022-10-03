import { Link, useAsyncValue, useLocation, Await } from "@remix-run/react";
import { Country } from "@shopify/hydrogen-ui-alpha/storefront-api-types";

import {Listbox} from '@headlessui/react';
import { useState, Suspense } from "react";
import { IconCaret, IconCheck } from "./Icon";

export function CountrySelector({
  defaultCountry,
  countries,
}: {
  defaultCountry: Country;
  countries: Array <Country>;
}) {
  const selectedCountry = defaultCountry.isoCode;
  return (
    <Suspense fallback={<CountrySelectorFallback />}>
      <Await resolve={countries}>
        <CountrySelectorElement
          defaultCountry={defaultCountry}
          selectedCountry={selectedCountry}
        />
      </Await>
    </Suspense>
  )
}

function CountrySelectorFallback() {
  return (
    <div className="relative">
      <Listbox>
      <Listbox.Button
          className={'flex items-center justify-between w-full py-3 px-4 border rounded border-contrast/30 dark:border-white'}
        >
          <span className="">--</span>
          <IconCaret direction={'down'} />
        </Listbox.Button>
      </Listbox>
    </div>
  )
}

function CountrySelectorElement({
  defaultCountry,
  selectedCountry
}: {
  defaultCountry: Country;
  selectedCountry: string;
}) {
  const [listboxOpen, setListboxOpen] = useState(false);
  const countries = useAsyncValue<Array <Country>>();
  const { pathname } = useLocation();
  const currentCountry = countries.find(country => country.isoCode === selectedCountry) || defaultCountry;

  return (
    <div className="relative">
      <Listbox>
        {({open}) => {
          setTimeout(() => setListboxOpen(open));
          return (
            <>
              <Listbox.Button
                className={`flex items-center justify-between w-full py-3 px-4 border ${
                  open ? 'rounded-b md:rounded-t md:rounded-b-none' : 'rounded'
                } border-contrast/30 dark:border-white`}
              >
                <span className="">{currentCountry.name} ({currentCountry.currency.isoCode} {currentCountry.currency.symbol})</span>
                <IconCaret direction={open ? 'up' : 'down'} />
              </Listbox.Button>

              <Listbox.Options
                className={`border-t-contrast/30 border-contrast/30 bg-primary dark:bg-contrast absolute bottom-12 z-10 grid
                h-48 w-full overflow-y-scroll rounded-t border dark:border-white px-2 py-2
                transition-[max-height] duration-150 sm:bottom-auto md:rounded-b md:rounded-t-none
                md:border-t-0 md:border-b ${
                  listboxOpen ? 'max-h-48' : 'max-h-0'
                }`}
              >
                {listboxOpen && Object.values(countries).map(country => {
                  const isSelected = country.isoCode === currentCountry.isoCode;
                  const countryIsoCode = country.isoCode.toLocaleLowerCase();
                  return (
                    <Listbox.Option key={country.isoCode} value={country}>
                      {({active}) => (
                        <Link
                          to={countryIsoCode !== 'us' ? `/${countryIsoCode}${pathname}` : '/'}
                          className={`text-contrast dark:text-primary text-contrast dark:text-primary bg-primary
                          dark:bg-contrast w-full p-2 transition rounded
                          flex justify-start items-center text-left cursor-pointer ${
                            active ? 'bg-primary/10' : null
                          }`}
                        >
                          {country.name} ({country.currency.isoCode} {country.currency.symbol})
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
  );
}
