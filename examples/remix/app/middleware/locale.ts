import { createContextKey, type Middleware } from "remix/router";

import { DEFAULT_LOCALE, resolveLocale, type Locale } from "../lib/public/i18n.ts";

export const LocaleContext = createContextKey<Locale>(DEFAULT_LOCALE);
const localeProperty = { property: "locale" } as const;

/**
 * Resolves an optional locale prefix such as `/en-ca`, then routes the prefix-free
 * path so every route matches every locale. An unsupported locale-shaped prefix is left
 * in place, so no route matches and the app renders its 404 page.
 */
export function locale(): Middleware<{
  key: typeof LocaleContext;
  value: Locale;
  property: "locale";
}> {
  return (context, next) => {
    const resolution = resolveLocale(context.url.pathname);

    if (resolution.kind === "unknown") {
      context.set(LocaleContext, DEFAULT_LOCALE, localeProperty);
      return next();
    }

    context.set(LocaleContext, resolution.locale, localeProperty);
    context.url.pathname = resolution.pathname;
    return next();
  };
}
