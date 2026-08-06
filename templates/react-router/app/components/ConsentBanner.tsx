import { useEffect, useState } from "react";

import { content } from "~/lib/content";

type ConsentChoice = {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  sale_of_data: boolean;
};

type CustomerPrivacyApi = {
  setTrackingConsent?: (choice: ConsentChoice, callback: () => void) => void;
  shouldShowBanner?: () => boolean;
};

const CONSENT_API_RETRY_DELAY_MS = 100;
const CONSENT_API_MAX_RETRIES = 50;

function setTrackingConsent(choice: ConsentChoice, afterSave: () => void) {
  const customerPrivacy: CustomerPrivacyApi | undefined = window.Shopify?.customerPrivacy;

  if (!customerPrivacy?.setTrackingConsent) {
    afterSave();
    return;
  }

  customerPrivacy.setTrackingConsent(choice, afterSave);
}

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let attempts = 0;
    let timeoutId: number | undefined;

    const checkVisibility = () => {
      const customerPrivacy: CustomerPrivacyApi | undefined = window.Shopify?.customerPrivacy;
      if (customerPrivacy?.shouldShowBanner) {
        setVisible(customerPrivacy.shouldShowBanner());
        return;
      }

      attempts += 1;
      if (attempts < CONSENT_API_MAX_RETRIES) {
        timeoutId = window.setTimeout(checkVisibility, CONSENT_API_RETRY_DELAY_MS);
      }
    };

    checkVisibility();
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  if (dismissed || !visible) return null;

  const save = (choice: ConsentChoice) => {
    setTrackingConsent(choice, () => setDismissed(true));
  };

  return (
    <div className="consent-banner" role="region" aria-label={content.consent.label}>
      <p className="type-body text-on-surface">
        {content.consent.message}{" "}
        <span className="text-link underline">{content.consent.privacyPolicy} (coming soon)</span>
      </p>
      <div className="consent-banner-actions">
        <button
          type="button"
          onClick={() =>
            save({ analytics: false, marketing: false, preferences: false, sale_of_data: false })
          }
          className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {content.consent.decline}
        </button>
        <button
          type="button"
          onClick={() =>
            save({ analytics: true, marketing: true, preferences: true, sale_of_data: true })
          }
          className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {content.consent.acceptAll}
        </button>
      </div>
    </div>
  );
}
