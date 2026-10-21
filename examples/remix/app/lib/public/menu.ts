import { localizePath } from "./i18n.ts";

export type MenuLink = {
  id: string;
  title: string;
  url: string;
  /** External links open in a new tab. */
  external: boolean;
};

type MenuItemInput = { id: string; title: string; url?: string | null };

/**
 * Normalizes Shopify menu items into app links: URLs on the shop's own domains become
 * app paths in the active locale, and other URLs stay external.
 */
export function toMenuLinks(
  items: readonly MenuItemInput[],
  { pathPrefix, shopDomains }: { pathPrefix: string; shopDomains: readonly string[] },
): MenuLink[] {
  return items.flatMap((item) => {
    if (!item.url) return [];

    const isShopUrl =
      item.url.includes("myshopify.com") ||
      shopDomains.some((domain) => domain && item.url?.includes(domain));
    const url = isShopUrl ? new URL(item.url).pathname : item.url;
    const external = !url.startsWith("/");

    return [
      {
        id: item.id,
        title: item.title,
        url: external ? url : localizePath(url, pathPrefix),
        external,
      },
    ];
  });
}
