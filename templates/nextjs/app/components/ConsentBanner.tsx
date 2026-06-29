"use client";

import { useEffect, useState } from "react";

const CONSENT_LABELS = {
  message: "We use cookies to improve your experience, analyze traffic, and personalize content.",
  privacyPolicy: "Privacy Policy",
  managePreferences: "Manage preferences",
  decline: "Decline",
  acceptAll: "Accept all",
};

type ConsentChoice = {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  sale_of_data: boolean;
};

function setTrackingConsent(choice: ConsentChoice, afterSave: () => void) {
  const customerPrivacy = window.Shopify?.customerPrivacy as
    | {
        setTrackingConsent?: (choice: ConsentChoice, callback: () => void) => void;
      }
    | undefined;

  if (!customerPrivacy?.setTrackingConsent) {
    afterSave();
    return;
  }

  customerPrivacy.setTrackingConsent(choice, afterSave);
}

export function ConsentBanner({ forceShow }: { forceShow: boolean }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [choice, setChoice] = useState<ConsentChoice>({
    analytics: true,
    marketing: false,
    preferences: true,
    sale_of_data: false,
  });

  useEffect(() => {
    if (forceShow) return;

    const customerPrivacy = window.Shopify?.customerPrivacy as
      | { shouldShowBanner?: () => boolean }
      | undefined;
    const shouldShow = Boolean(customerPrivacy?.shouldShowBanner?.());
    const id = window.setTimeout(() => setVisible(shouldShow), 0);
    return () => window.clearTimeout(id);
  }, [forceShow]);

  if (dismissed || (!forceShow && !visible)) return null;

  const save = (nextChoice: ConsentChoice) => {
    setTrackingConsent(nextChoice, () => setDismissed(true));
  };

  return (
    <aside
      data-testid="consent-banner"
      className="consent-banner"
      role="region"
      aria-label="Cookie consent"
    >
      <div className="flex flex-col gap-3">
        <p className="type-body-sm">
          {CONSENT_LABELS.message}{" "}
          <a href="#" className="text-accent underline underline-offset-2">
            {CONSENT_LABELS.privacyPolicy}
          </a>
        </p>
        {preferencesOpen ? (
          <div className="grid gap-2" aria-label="Cookie preferences">
            {(
              [
                ["analytics", "Analytics"],
                ["marketing", "Marketing"],
                ["preferences", "Preferences"],
                ["sale_of_data", "Sale of data"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="min-h-touch-target flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={choice[key]}
                  onChange={(event) => setChoice({ ...choice, [key]: event.currentTarget.checked })}
                />
                {label}
              </label>
            ))}
            <button
              type="button"
              className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              onClick={() => save(choice)}
            >
              Save preferences
            </button>
          </div>
        ) : null}
      </div>
      <div className="consent-banner-actions">
        <button
          type="button"
          className="rounded-button button-ghost focus-visible:outline-accent inline-flex h-11 items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() => setPreferencesOpen((open) => !open)}
        >
          {CONSENT_LABELS.managePreferences}
        </button>
        <button
          type="button"
          className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() =>
            save({ analytics: false, marketing: false, preferences: false, sale_of_data: false })
          }
        >
          {CONSENT_LABELS.decline}
        </button>
        <button
          type="button"
          className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() =>
            save({ analytics: true, marketing: true, preferences: true, sale_of_data: true })
          }
        >
          {CONSENT_LABELS.acceptAll}
        </button>
      </div>
    </aside>
  );
}
