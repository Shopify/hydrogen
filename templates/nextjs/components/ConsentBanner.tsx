"use client";

import { useEffect, useState } from "react";

import { content } from "@/lib/content";

type ConsentChoice = {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  sale_of_data: boolean;
};

function customerPrivacy() {
  return window.Shopify?.customerPrivacy;
}

function recordConsent(choice: ConsentChoice, done: () => void) {
  const setTrackingConsent = customerPrivacy()?.setTrackingConsent;
  if (!setTrackingConsent) {
    done();
    return;
  }
  setTrackingConsent(choice, done);
}

const allConsent: ConsentChoice = {
  analytics: true,
  marketing: true,
  preferences: true,
  sale_of_data: true,
};

const noConsent: ConsentChoice = {
  analytics: false,
  marketing: false,
  preferences: false,
  sale_of_data: false,
};

export function ConsentBanner({ forceShow }: { forceShow: boolean }) {
  const [visible, setVisible] = useState(forceShow);

  useEffect(() => {
    if (forceShow) return;

    let cancelled = false;
    const decide = () => {
      if (cancelled) return true;
      const privacy = customerPrivacy();
      // The API methods are installed before Shopify finishes loading the
      // buyer's initial consent state. Do not make the one-time visibility
      // decision until that state is ready.
      if (privacy?.consentStatus !== "loaded" || !privacy.shouldShowBanner) return false;
      setVisible(Boolean(privacy.shouldShowBanner()));
      return true;
    };

    if (decide()) return;
    const timer = window.setInterval(() => {
      if (decide()) window.clearInterval(timer);
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [forceShow]);

  if (!visible) return null;

  const hide = () => setVisible(false);

  return (
    <div className="consent-banner" role="region" aria-label={content.consent.label}>
      <p className="type-body text-on-surface">
        {content.consent.message}{" "}
        <span className="text-link underline">{content.consent.privacyPolicy} (coming soon)</span>
      </p>
      <div className="consent-banner-actions">
        <button
          type="button"
          onClick={() => recordConsent(noConsent, hide)}
          className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {content.consent.decline}
        </button>
        <button
          type="button"
          onClick={() => recordConsent(allConsent, hide)}
          className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {content.consent.acceptAll}
        </button>
      </div>
    </div>
  );
}
