"use client";

import { useEffect } from "react";

import { content } from "@/lib/content";

/**
 * Global error boundary (engineering.md F8). Next.js renders this when a route
 * or layout throws. Must be a client component (`'use client'`) and render a
 * `<html>`/`<body>` shell when used as `app/global-error.tsx`; this segment
 * error boundary renders inside the existing root layout, so it only needs the
 * error UI + a `reset` button.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[hydrogen-example-nextjs] Route error:", error);
  }, [error]);

  return (
    <div className="max-w-page px-margin mx-auto py-16">
      <h1 className="type-heading-xl mb-4">Something went wrong</h1>
      <p className="type-body text-on-surface-secondary mb-2">{error.message}</p>
      {error.digest ? (
        <p className="text-on-surface-secondary mb-8 text-sm">Error digest: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 items-center justify-center px-5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {content.general.back}
      </button>
    </div>
  );
}
