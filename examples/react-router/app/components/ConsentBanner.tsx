import { useEffect, useState } from "react";

import { content } from "~/lib/content";

const CONSENT_STORAGE_KEY = "core-consent-choice";

type ConsentChoice = "accepted" | "declined";

/**
 * Cookie / consent banner — the one deliberate JavaScript-only exception to the
 * whole-site no-JS contract (`notes/consent-banner.md` + engineering.md F4
 * Known-deferred). It gates nothing else: with JS disabled it does not render,
 * and that is acceptable because there is no consent to capture and no
 * analytics to gate. The banner's `mode: "default-banner"` analytics consent is
 * handled by the analytics bus (`hydrogen-analytics`); this is the app-owned
 * dismiss/persist UI layered on top.
 */
export function ConsentBanner() {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored === "accepted" || stored === "declined") {
        setChoice(stored);
      }
    } catch {
      // localStorage may be unavailable; treat as no prior choice.
    }
  }, []);

  if (!mounted || choice !== null) return null;

  const persist = (value: ConsentChoice) => {
    setChoice(value);
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, value);
    } catch {
      // Ignore storage failures.
    }
  };

  return (
    <div className="consent-banner" role="region" aria-label={content.consent.label}>
      <p className="type-body text-on-surface">
        {content.consent.message}{" "}
        <a href="#" className="text-accent underline">
          {content.consent.privacyPolicy}
        </a>
      </p>
      <div className="consent-banner-actions">
        <button
          type="button"
          onClick={() => persist("declined")}
          className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {content.consent.decline}
        </button>
        <button
          type="button"
          onClick={() => persist("accepted")}
          className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {content.consent.acceptAll}
        </button>
      </div>
    </div>
  );
}
