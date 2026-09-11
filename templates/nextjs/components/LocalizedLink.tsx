"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { useLocalizedHref } from "./LocaleProvider";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  /** Unprefixed internal path, for example `/products/x`. Localized for the current locale. */
  href: string;
};

/**
 * `next/link` for internal routes. Write hrefs without a locale prefix; the current locale's
 * prefix (pathname routing) or hostname (domain routing) is applied here, so server and client
 * components can link the same way without knowing how locales are routed.
 */
export function LocalizedLink({ href, ...props }: Props) {
  const localize = useLocalizedHref();
  return <Link {...props} href={localize(href)} />;
}
