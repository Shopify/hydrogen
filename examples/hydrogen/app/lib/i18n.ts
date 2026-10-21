import type { I18nConfig } from "@shopify/hydrogen";

export type I18nLocale = I18nConfig & {
  pathPrefix: string;
};

const LOCALES_BY_PATH_PART: Record<string, Pick<I18nLocale, "country" | "language">> = {
  "EN-CA": { country: "CA", language: "EN" },
  "EN-US": { country: "US", language: "EN" },
  "FR-CA": { country: "CA", language: "FR" },
};

export function getLocaleFromRequest(request: Request): I18nLocale {
  const url = new URL(request.url);
  const firstPathPart = url.pathname.split("/")[1]?.toUpperCase() ?? "";
  let pathPrefix = "";
  let locale = LOCALES_BY_PATH_PART["EN-US"];

  if (LOCALES_BY_PATH_PART[firstPathPart]) {
    pathPrefix = "/" + firstPathPart;
    locale = LOCALES_BY_PATH_PART[firstPathPart];
  }

  return { ...locale, pathPrefix };
}
