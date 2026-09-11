"use client";

import { getLocalizedHref } from "@shopify/hydrogen";
import { createContext, useContext } from "react";

import { i18n } from "@/lib/config";
import type { Locale } from "@/lib/locale";

const LocaleContext = createContext<Locale | undefined>(undefined);

/**
 * Makes the `[locale]` segment's resolved locale available to client components, and through
 * `LocalizedLink` to server components too, without threading it through every prop. Rendered
 * once by the `[locale]` layout; the value is a plain serializable object.
 */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  const locale = useContext(LocaleContext);
  if (!locale) {
    throw new Error("useLocale must be rendered inside the [locale] layout's LocaleProvider.");
  }
  return locale;
}

/** Rewrites an unprefixed internal path (`/products/x`) into the current locale. */
export function useLocalizedHref(): (path: string) => string {
  const locale = useLocale();
  return (path) => getLocalizedHref(path, { i18n, locale });
}
