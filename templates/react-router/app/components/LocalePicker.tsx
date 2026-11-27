import type { ShopifyI18n } from "@shopify/hydrogen";
import { useLocale } from "@shopify/hydrogen/react";
import type { FocusEvent, KeyboardEvent } from "react";
import { useLocation } from "react-router";

import { formatLocaleLabel, getLocaleLinks, type LocaleOption } from "~/lib/locale";

type LocalePickerProps = {
  i18n: ShopifyI18n;
  /** From `getLocaleOptions` in the root loader; empty for a single-locale storefront. */
  options: readonly LocaleOption[];
};

// A native <details> disclosure of plain links, so the picker opens and switches locale
// without JavaScript. Each link is a full page load on purpose: Shopify's scripts and the cart
// read the locale once per document.
export function LocalePicker({ i18n, options }: LocalePickerProps) {
  const locale = useLocale();
  const { pathname, search } = useLocation();
  if (options.length < 2) return null;

  const links = getLocaleLinks({
    i18n,
    options,
    currentLocale: locale,
    href: `${pathname}${search}`,
  });
  const current = links.find((link) => link.current);
  if (!current) return null;

  return (
    <details
      className="group relative"
      data-testid="locale-picker"
      onKeyDown={closeOnEscape}
      onBlur={closeOnFocusLeave}
    >
      <summary className="marker-hidden text-on-surface focus-visible:outline-accent inline-flex h-11 cursor-pointer items-center gap-1 rounded px-2 text-sm font-normal whitespace-nowrap hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-opacity">
        <span className="sr-only">Language and region: {formatLocaleLabel(current)}</span>
        <span aria-hidden="true">
          <span className="md:hidden">{current.languageName}</span>
          <span className="max-md:hidden">{formatLocaleLabel(current)}</span>
        </span>
        <span
          className="inline-flex size-4 shrink-0 items-center justify-center group-open:rotate-180 motion-safe:transition-transform motion-safe:duration-200"
          aria-hidden="true"
        >
          <img src="/icons/icon-chevron-down.svg" alt="" className="size-4" />
        </span>
      </summary>
      <ul
        role="list"
        className="border-border bg-surface max-h-dialog-max-height absolute end-0 top-full z-50 mt-1 min-w-56 overflow-y-auto rounded border py-2 shadow-lg"
      >
        {links.map((link) => (
          <li key={`${link.language}-${link.country}`}>
            <a
              href={link.href}
              hrefLang={link.hrefLang}
              lang={link.lang}
              aria-current={link.current ? "page" : undefined}
              className="min-h-touch-target text-on-surface hover:bg-hover focus-visible:outline-accent flex items-center px-4 text-sm font-normal whitespace-nowrap no-underline focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 aria-[current=page]:font-medium"
            >
              {formatLocaleLabel(link)}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

// <details> has no built-in Escape handling; closing it keeps keyboard users where they were.
function closeOnEscape(event: KeyboardEvent<HTMLDetailsElement>) {
  const details = event.currentTarget;
  if (event.key !== "Escape" || !details.open) return;
  details.open = false;
  details.querySelector("summary")?.focus();
}

// An open menu left behind after tabbing past it would cover the header. Only close when focus
// moves to another element: Safari doesn't focus a clicked link, so a blur with no new target
// can be the start of a click on one of the menu's own links.
function closeOnFocusLeave(event: FocusEvent<HTMLDetailsElement>) {
  const next = event.relatedTarget;
  if (next && !event.currentTarget.contains(next)) event.currentTarget.open = false;
}
