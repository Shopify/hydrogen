"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { content } from "@/lib/content";

import { PredictiveSearchModal } from "./PredictiveSearchModal";

/**
 * Search trigger — a real server-rendered `<Link href="/search">` baseline
 * (F4: reachable without JS) that hydrates into the predictive-search modal
 * trigger after hydration. Renders `PredictiveSearchModal` (client) when open.
 */
export function PredictiveSearchTrigger() {
  const [searchOpen, setSearchOpen] = useState(false);
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerSnapshot,
  );

  if (!hasHydrated) {
    // No-JS / pre-hydration baseline: a real /search link.
    return (
      <Link
        href="/search"
        className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 items-center justify-center rounded no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label={content.general.search}
        data-testid="search-modal-trigger"
      >
        <img
          src="/icons/icon-search.svg"
          width="20"
          height="20"
          alt=""
          className="size-5"
          aria-hidden="true"
        />
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 items-center justify-center rounded no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label={content.general.search}
        aria-haspopup="dialog"
        aria-expanded={searchOpen}
        aria-controls="search-modal"
        data-testid="search-modal-trigger"
      >
        <img
          src="/icons/icon-search.svg"
          width="20"
          height="20"
          alt=""
          className="size-5"
          aria-hidden="true"
        />
      </button>
      <PredictiveSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function subscribeToHydration() {
  return () => {};
}

function getHydratedSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}
