import { DEFAULT_SITE_ORIGIN } from "./site";

type RootRouteData = { shopName?: string; siteOrigin?: string };

export function shopNameFromMatches(matches: unknown): string {
  return rootDataFromMatches(matches)?.shopName ?? "";
}

export function shopTitle(pageTitle: string, shopName: string): string {
  return shopName ? `${pageTitle} — ${shopName}` : pageTitle;
}

export function siteOriginFromMatches(matches: unknown): string {
  return rootDataFromMatches(matches)?.siteOrigin ?? DEFAULT_SITE_ORIGIN;
}

function rootDataFromMatches(matches: unknown): RootRouteData | undefined {
  if (!Array.isArray(matches)) return undefined;

  const root = matches.find((match: unknown) => isRecord(match) && match.id === "root");
  if (!isRecord(root) || !isRecord(root.data)) return undefined;

  return {
    shopName: typeof root.data.shopName === "string" ? root.data.shopName : undefined,
    siteOrigin: typeof root.data.siteOrigin === "string" ? root.data.siteOrigin : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
