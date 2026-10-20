import type { ConsentPreferences, ConsentSetup } from "@shopify/hydrogen";
import { useCallback, useState } from "react";

/** A minimal app-owned banner: setup stays pending until the shopper's choice is saved. */
export function useCustomConsentBanner() {
  const [saveConsent, setSaveConsent] = useState<(choice: ConsentPreferences) => Promise<void>>();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const setup = useCallback<ConsentSetup>(
    () =>
      new Promise<void>((resolve) => {
        const customerPrivacy = window.Shopify?.customerPrivacy;
        if (!customerPrivacy) throw new Error("Shopify Customer Privacy API is unavailable.");
        setSaveConsent(() => async (choice: ConsentPreferences) => {
          await customerPrivacy.setTrackingConsent(choice);
          resolve();
        });
      }),
    [],
  );

  async function choose(allowed: boolean) {
    if (!saveConsent) return;
    setSaving(true);
    setError(false);
    try {
      await saveConsent({
        analytics: allowed,
        marketing: allowed,
        preferences: allowed,
        sale_of_data: allowed,
      });
      setSaved(true);
    } catch {
      // A failed write leaves setup pending so the shopper can retry.
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return {
    setup,
    banner: saved ? (
      <p role="status">Your privacy choice has been saved.</p>
    ) : (
      <section aria-labelledby="custom-consent-heading">
        <h2 id="custom-consent-heading">Your privacy choices</h2>
        <p>May we use analytics and marketing cookies?</p>
        <button disabled={!saveConsent || saving} onClick={() => void choose(true)}>
          Allow optional cookies
        </button>
        <button disabled={!saveConsent || saving} onClick={() => void choose(false)}>
          Decline optional cookies
        </button>
        {error ? <p role="alert">Your choice could not be saved. Please try again.</p> : null}
      </section>
    ),
  };
}
