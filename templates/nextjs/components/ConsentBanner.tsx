"use client";

import { useSyncExternalStore } from "react";

import { content } from "@/lib/content";

const CONSENT_STORAGE_KEY = "core-consent-choice";
const CONSENT_CHANGE_EVENT = "hydrogen-consent-change";

type ConsentChoice = "accepted" | "declined";

/**
 * Cookie / consent banner — the one deliberate JavaScript-only exception to the
 * whole-site no-JS contract. It gates nothing else: with JS disabled it does not render,
 * and that is acceptable because there is no consent to capture and no
 * analytics to gate. The banner's `mode: "default-banner"` analytics consent is
 * handled by the analytics bus (`hydrogen-analytics`); this is the app-owned
 * dismiss/persist UI layered on top.
 */
export function ConsentBanner() {
  const choice = useSyncExternalStore(
    subscribeToConsentChoice,
    getConsentChoice,
    getServerConsentChoice,
  );

  if (choice !== null) return null;

  const persist = (value: ConsentChoice) => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, value);
      window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
    } catch {
      // Ignore storage failures.
    }
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

function subscribeToConsentChoice(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  };
}

function getConsentChoice(): ConsentChoice | null {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    return stored === "accepted" || stored === "declined" ? stored : null;
  } catch {
    return null;
  }
}

function getServerConsentChoice() {
  return null;
}
