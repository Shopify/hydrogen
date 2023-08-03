import type {Localizations, I18nLocale} from '../../@types/i18next';
import {CartForm} from '@shopify/hydrogen';
import {localizePath, delocalizePath} from '~/utils';
import {useEffect, useMemo, useRef} from 'react';
import {useLocale} from '~/hooks/useLocale';
import {useFetcher} from '@remix-run/react';

export function LocaleSwitcher() {
  const fetcher = useFetcher();
  const i18n = useLocale();
  const selectedI18n = useRef<I18nLocale>(i18n);
  const allLocalizations = (fetcher?.data?.localizations ??
    null) as Localizations | null;
  const cartCountryCode = fetcher.data?.cart?.buyerIdentity?.countryCode;
  const localizations = useMemo(() => {
    if (!allLocalizations) return [i18n];
    return [i18n, ...Object.values(allLocalizations)];
  }, [allLocalizations, i18n]);

  /**
   * Fetch all the localizations from the internal localizations API.
   * This is used to populate the localization switcher and is done dynamically
   * on clicking the select in order to avoid loading all the locales on page load.
   */
  function getLocalizations() {
    fetcher.load('/api/localizations');
  }

  /**
   * Update the cart's buyer identity with the new country code.
   */
  function updateCartBuyerIdentity() {
    if (!selectedI18n?.current.country) return;

    const form = new FormData();

    form.append(
      'cartFormInput',
      JSON.stringify({
        action: CartForm.ACTIONS.BuyerIdentityUpdate,
        inputs: {
          buyerIdentity: {
            countryCode: selectedI18n.current.country,
          },
          redirectTo: location.pathname,
        },
      }),
    );

    // update the country code in the cart's buyer identity
    fetcher.submit(form, {
      method: 'POST',
      action: localizePath('/cart', selectedI18n.current),
    });
  }

  /**
   * Switch to the selected locale
   */
  function switchLocale(event: React.ChangeEvent<HTMLSelectElement>) {
    const selected = JSON.parse(event.target.value) as I18nLocale;
    if (!selected?.country || !selected?.language) return;
    selectedI18n.current = selected;
    updateCartBuyerIdentity();
  }

  // After the cart's buyer identity has been updated, navigate to the new locale.
  useEffect(() => {
    /**
     * Navigate to the new locale.
     */
    function navigateToLocale() {
      const isDefaultLocale =
        selectedI18n.current.country === i18n.country &&
        selectedI18n.current.language === i18n.language;

      if (isDefaultLocale) {
        // don't add the default locale to the url
        window.location.href = window.location.pathname;
        return;
      }

      // clear current localization prefix (if any)
      const pathname = delocalizePath(window.location.pathname);

      // navigate to the new locale
      window.location.href = localizePath(pathname, selectedI18n.current);
    }

    const updatedBuyerIdentity =
      cartCountryCode === selectedI18n.current.country;
    const finishedUpdating = fetcher.type === 'done';

    if (updatedBuyerIdentity && finishedUpdating) {
      navigateToLocale();
    }
  }, [fetcher.type, i18n, selectedI18n, cartCountryCode]);

  return (
    <div style={{marginLeft: '1rem', display: 'flex', gap: '.5rem'}}>
      <select
        name="localizations"
        onChange={switchLocale}
        onClick={getLocalizations}
        style={{minWidth: 160}}
        value={JSON.stringify(selectedI18n)}
      >
        {Object.entries(localizations).map(([key, value]) => {
          return (
            <option key={key} value={JSON.stringify(value)}>
              {value.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}
