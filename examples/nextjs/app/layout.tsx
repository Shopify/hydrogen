import type { Metadata } from "next";
import { Suspense } from "react";

import "./globals.css";

import { SITE_ORIGIN } from "@/lib/site";

import { AppShell } from "./app-shell";

/**
 * Root layout (engineering.md F1, F4, F7, F10). With `cacheComponents: true`,
 * the layout is a **static shell** — it prerenders the `<html>`/`<body>` +
 * announcement bar, then wraps the per-request (dynamic) `AppShell` (cart seed
 * + analytics shop + chrome) in `<Suspense>` so the dynamic parts stream while
 * the static shell serves immediately. `AppShell` calls `connection()` to opt
 * the subtree into dynamic rendering.
 *
 * `metadataBase` is set here for canonical/OG URL resolution (F10).
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "CORE — Discover our latest collection",
    template: "%s — CORE",
  },
  description: "Explore our curated selection of premium products",
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml" },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface text-on-surface font-body flex min-h-svh flex-col antialiased">
        <div
          role="region"
          aria-label="Announcement"
          className="bg-on-surface px-margin py-2.5 text-center"
        >
          <p className="type-body-sm text-surface">Free shipping on orders over $50</p>
        </div>

        <Suspense
          fallback={
            <div className="bg-surface text-on-surface-secondary flex-1" aria-busy="true" />
          }
        >
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
