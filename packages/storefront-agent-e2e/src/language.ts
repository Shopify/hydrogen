import { gql } from "@shopify/hydrogen";

import {
  assertNoGraphQLErrors,
  createStorefrontApiClient,
  isLanguageCode,
  requestSignal,
  type CountryCode,
  type LanguageCode,
} from "./storefront-api";

const AVAILABLE_LANGUAGES_QUERY = gql(`
  query AgentTaskLanguages {
    localization {
      availableLanguages {
        isoCode
      }
    }
  }
`);

/**
 * The Storefront API language that matches what shoppers see, so the goal and the checks use the
 * product and option names on the page. Reads the storefront's `<html lang>` unless
 * STOREFRONT_LANGUAGE overrides it, and keeps only languages the shop has published.
 */
export async function resolveLanguage(options: {
  readonly storefrontBaseUrl: string;
  readonly shopDomain: string;
  readonly country: CountryCode;
  readonly override: string | undefined;
}): Promise<LanguageCode> {
  const { storefrontBaseUrl, shopDomain, country, override } = options;
  const client = createStorefrontApiClient(shopDomain, country);
  const result = await client.graphql(AVAILABLE_LANGUAGES_QUERY, { signal: requestSignal() });
  assertNoGraphQLErrors("Available languages", result.errors);
  const available = (result.data?.localization.availableLanguages ?? [])
    .map((l): string => l.isoCode)
    .filter(isLanguageCode);

  if (override) {
    const chosen = matchLanguage(override, available);
    if (!chosen) {
      throw new Error(
        `STOREFRONT_LANGUAGE "${override}" is not published on ${shopDomain}. Available: ${available.join(", ")}`,
      );
    }
    return chosen;
  }

  const html = await fetch(storefrontBaseUrl, { signal: requestSignal() }).then(
    (response) => response.text(),
    () => "",
  );
  const lang = /<html[^>]*\blang=["']?([\w-]+)/i.exec(html)?.[1];
  const fromPage = lang ? matchLanguage(lang, available) : undefined;
  if (fromPage) return fromPage;
  // No usable <html lang>: English if published, else whatever the shop publishes first.
  return available.includes("EN") ? "EN" : (available[0] ?? "EN");
}

/**
 * Maps a BCP 47 tag ("pt-BR", "fr") to a published Storefront API code ("PT_BR", "FR"), trying the
 * full tag first and then the base language.
 */
export function matchLanguage(
  tag: string,
  available: readonly LanguageCode[],
): LanguageCode | undefined {
  const [base = "", region] = tag.trim().toUpperCase().split(/[-_]/);
  const candidates = region ? [`${base}_${region}`, base] : [base];
  return candidates
    .map((candidate) => available.find((code) => code === candidate))
    .find((code) => code !== undefined);
}
