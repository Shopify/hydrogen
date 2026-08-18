import {
  LOCALIZATION_API_PATH,
  LOCALIZATION_COUNTRY_FIELD,
  LOCALIZATION_LANGUAGE_FIELD,
  LOCALIZATION_REDIRECT_TO_FIELD,
} from "@shopify/hydrogen";
import type { LocalizationData } from "@shopify/hydrogen";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";

import type { I18nLocale } from "~/lib/i18n";

interface CountrySelectorProps {
  localization: LocalizationData;
  i18n: Pick<I18nLocale, "country" | "language">;
}

/**
 * Progressively enhanced country/currency and language selector.
 *
 * Layer 0 (no JavaScript): plain HTML forms with visible submit buttons post to the
 * localization endpoint, which validates the selection, updates the cart buyer identity,
 * saves it to the session, and 303-redirects back to this page under the new locale's prefix.
 *
 * Layer 1 (hydrated): selecting an option submits immediately and the buttons hide. The
 * submit is still a full document navigation — every rendered price changes with the locale.
 *
 * Country and language are separate forms (the Liquid theme pattern) so a country switch
 * never submits a language the new country doesn't offer — the server picks the best
 * language for the new country instead.
 */
export function CountrySelector({ localization, i18n }: CountrySelectorProps) {
  const { pathname, search } = useLocation();
  const redirectTo = pathname + search;
  const enhanced = useEnhanced();

  const currentCountry = localization.availableCountries.find(
    (country) => country.isoCode === i18n.country,
  );
  const availableLanguages = currentCountry?.availableLanguages ?? [];

  return (
    <div className="country-selector">
      <form method="post" action={LOCALIZATION_API_PATH}>
        <input type="hidden" name={LOCALIZATION_REDIRECT_TO_FIELD} value={redirectTo} />
        <label>
          <span className="sr-only">Country</span>
          <select
            name={LOCALIZATION_COUNTRY_FIELD}
            defaultValue={i18n.country}
            onChange={submitFormOnChange}
          >
            {localization.availableCountries.map((country) => (
              <option key={country.isoCode} value={country.isoCode}>
                {country.name} ({country.currency.isoCode} {country.currency.symbol})
              </option>
            ))}
          </select>
        </label>
        <button type="submit" hidden={enhanced}>
          Update country
        </button>
      </form>

      {availableLanguages.length > 1 && (
        <form method="post" action={LOCALIZATION_API_PATH}>
          <input type="hidden" name={LOCALIZATION_REDIRECT_TO_FIELD} value={redirectTo} />
          <input type="hidden" name={LOCALIZATION_COUNTRY_FIELD} value={i18n.country} />
          <label>
            <span className="sr-only">Language</span>
            <select
              name={LOCALIZATION_LANGUAGE_FIELD}
              defaultValue={i18n.language}
              onChange={submitFormOnChange}
            >
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
          <button type="submit" hidden={enhanced}>
            Update language
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * The upcoming localization client store debounces rapid keyboard selection before
 * navigating; this lightweight example submits directly on commit of a selection.
 */
function submitFormOnChange(event: React.ChangeEvent<HTMLSelectElement>) {
  event.currentTarget.form?.requestSubmit();
}

/** False during SSR and before hydration, so the no-JS submit buttons stay visible. */
function useEnhanced(): boolean {
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => setEnhanced(true), []);
  return enhanced;
}
