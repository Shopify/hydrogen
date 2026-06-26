import { useEffect, useState } from "react";

type ConsentChoice = {
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  sale_of_data: boolean;
};

type CustomerPrivacy = {
  shouldShowBanner?: () => boolean;
  setTrackingConsent?: (choice: ConsentChoice, callback?: () => void) => void;
};

function customerPrivacy(): CustomerPrivacy | undefined {
  return window.Shopify?.customerPrivacy as CustomerPrivacy | undefined;
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
  const [managing, setManaging] = useState(false);
  const [choice, setChoice] = useState<ConsentChoice>({
    analytics: true,
    marketing: false,
    preferences: true,
    sale_of_data: false,
  });

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      return;
    }

    let cancelled = false;
    const decide = () => {
      if (cancelled) return true;
      const shouldShowBanner = customerPrivacy()?.shouldShowBanner;
      if (!shouldShowBanner) return false;
      setVisible(Boolean(shouldShowBanner()));
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
    <aside
      data-testid="consent-banner"
      className="consent-banner"
      role="region"
      aria-label="Cookie consent"
    >
      <div className="max-w-prose">
        <p className="type-body-sm text-on-surface">
          We use cookies to improve your experience, analyze traffic, and personalize content. You
          can accept all cookies, decline non-essential ones, or manage your preferences. Read our{" "}
          <a
            href="#"
            className="text-accent focus-visible:outline-accent underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Privacy Policy
          </a>
          .
        </p>
        {managing ? (
          <fieldset className="mt-4 grid gap-2">
            <legend className="type-body-sm text-on-surface font-medium">Cookie preferences</legend>
            {(["analytics", "marketing", "preferences", "sale_of_data"] as const).map((key) => (
              <label key={key} className="min-h-touch-target flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={choice[key]}
                  onChange={(event) =>
                    setChoice((current) => ({ ...current, [key]: event.target.checked }))
                  }
                />
                <span className="capitalize">{key.replaceAll("_", " ")}</span>
              </label>
            ))}
            <button
              type="button"
              className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 cursor-pointer items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
              onClick={() => recordConsent(choice, hide)}
            >
              Save preferences
            </button>
          </fieldset>
        ) : null}
      </div>
      <div className="consent-banner-actions">
        <button
          type="button"
          className="rounded-button button-ghost focus-visible:outline-accent inline-flex h-11 cursor-pointer items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
          onClick={() => setManaging((current) => !current)}
        >
          Manage preferences
        </button>
        <button
          type="button"
          className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 cursor-pointer items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
          onClick={() => recordConsent(noConsent, hide)}
        >
          Decline
        </button>
        <button
          type="button"
          className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 cursor-pointer items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
          onClick={() => recordConsent(allConsent, hide)}
        >
          Accept all
        </button>
      </div>
    </aside>
  );
}
