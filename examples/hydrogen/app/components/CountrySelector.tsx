import {
  LOCALIZATION_API_PATH,
  LOCALIZATION_COUNTRY_FIELD,
  LOCALIZATION_LANGUAGE_FIELD,
  LOCALIZATION_REDIRECT_TO_FIELD,
} from "@shopify/hydrogen";
import type { LocalizationData } from "@shopify/hydrogen";
import { useLocation } from "react-router";

import type { I18nLocale } from "~/lib/i18n";

interface CountrySelectorProps {
  localization: LocalizationData;
  i18n: Pick<I18nLocale, "country" | "language">;
}

/**
 * Zero-JavaScript country/currency and language selector.
 *
 * Plain HTML forms post to the localization endpoint, which validates the selection, updates
 * the cart buyer identity, saves it to the session, and 303-redirects back to this page under
 * the new locale's path prefix. Country and language are separate forms (the Liquid theme
 * pattern) so a country switch never submits a language that the new country doesn't offer —
 * the server picks the best language for the new country instead.
 */
export function CountrySelector({ localization, i18n }: CountrySelectorProps) {
  const { pathname, search } = useLocation();
  const redirectTo = pathname + search;

  const currentCountry = localization.availableCountries.find(
    (country) => country.isoCode === i18n.country,
  );
  const availableLanguages = currentCountry?.availableLanguages ?? [];

  return (
    <div className="country-selector">
      <form method="post" action={LOCALIZATION_API_PATH}>
        <input type="hidden" name={LOCALIZATION_REDIRECT_TO_FIELD} value={redirectTo} />
        <label>
          Country
          <select name={LOCALIZATION_COUNTRY_FIELD} defaultValue={i18n.country}>
            {localization.availableCountries.map((country) => (
              <option key={country.isoCode} value={country.isoCode}>
                {country.name} ({country.currency.isoCode} {country.currency.symbol})
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Update country</button>
      </form>

      {availableLanguages.length > 1 && (
        <form method="post" action={LOCALIZATION_API_PATH}>
          <input type="hidden" name={LOCALIZATION_REDIRECT_TO_FIELD} value={redirectTo} />
          <input type="hidden" name={LOCALIZATION_COUNTRY_FIELD} value={i18n.country} />
          <label>
            Language
            <select name={LOCALIZATION_LANGUAGE_FIELD} defaultValue={i18n.language}>
              {availableLanguages.map((language) => (
                <option
                  key={language.isoCode}
                  value={language.isoCode}
                  lang={language.isoCode.toLowerCase()}
                >
                  {language.endonymName}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Update language</button>
        </form>
      )}
    </div>
  );
}
