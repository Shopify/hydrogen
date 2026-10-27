// SPIKE ONLY (agentic storefront E2E). A merchant-style change: a full-page sale overlay on the
// home page that blocks input until dismissed. Used to show regeneration of stale scripts.
import { useState } from "react";
import { useLocation } from "react-router";

export function SpikeDiscountBanner() {
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(false);
  if (pathname !== "/" || dismissed) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spike-discount-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
    >
      <div className="bg-surface text-on-surface max-w-lg rounded p-10 text-center">
        <h2 id="spike-discount-title" className="type-display mb-3 text-3xl">
          Black Friday: 30% off everything
        </h2>
        <p className="text-on-surface-secondary mb-8">
          Discount applied automatically at checkout.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-button button-primary h-11 px-6 text-sm font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
}
