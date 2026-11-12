import type { MoneyV2 } from "@shopify/hydrogen";

const GLOBAL_CATALOG_ENDPOINT = "https://catalog.shopify.com/api/ucp/mcp";
const CATALOG_AGENT_PROFILE =
  "https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json";
const SELLER_DOMAIN_SUFFIX = ".myshopify.com";
// The same grammar the cart handlers accept for `/api/cart?seller=<handle>`.
const SELLER_HANDLE_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;

export type GlobalCatalogItem = {
  variantId: string;
  title: string;
  imageUrl: string | null;
  url: string;
  price: MoneyV2;
  seller: { name: string; handle: string };
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function parseSellerHandle(domain: unknown): string | null {
  if (typeof domain !== "string" || !domain.endsWith(SELLER_DOMAIN_SUFFIX)) return null;
  const handle = domain.slice(0, -SELLER_DOMAIN_SUFFIX.length);
  return SELLER_HANDLE_RE.test(handle) ? handle : null;
}

// UCP sends ISO 4217 minor units, such as `{ amount: 1999, currency: "USD" }`.
function parseMoney(value: unknown): MoneyV2 | null {
  if (!isObject(value)) return null;
  const { amount, currency } = value;
  if (typeof amount !== "number" || typeof currency !== "string") return null;
  try {
    const digits =
      new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions()
        .maximumFractionDigits ?? 2;
    return { amount: (amount / 10 ** digits).toFixed(digits), currencyCode: currency };
  } catch {
    return null;
  }
}

function parseCatalogItem(product: unknown): GlobalCatalogItem | null {
  if (!isObject(product) || !Array.isArray(product.variants)) return null;
  const variant: unknown = product.variants[0];
  if (!isObject(variant) || !isObject(variant.seller) || typeof variant.id !== "string") {
    return null;
  }
  const handle = parseSellerHandle(variant.seller.domain);
  const price = parseMoney(variant.price);
  if (!handle || !price) return null;
  const media: unknown = Array.isArray(variant.media) ? variant.media[0] : undefined;
  return {
    variantId: variant.id,
    title: stringOr(product.title, stringOr(variant.title, "")),
    imageUrl: isObject(media) && typeof media.url === "string" ? media.url : null,
    url: stringOr(variant.url, `https://${handle}${SELLER_DOMAIN_SUFFIX}`),
    price,
    seller: { name: stringOr(variant.seller.name, handle), handle },
  };
}

export function parseCatalogItems(content: unknown): GlobalCatalogItem[] {
  if (!isObject(content) || !Array.isArray(content.products)) return [];
  return content.products.flatMap((product) => parseCatalogItem(product) ?? []);
}

/**
 * Searches Shopify's Global Catalog for products from other stores. Items from `homeStoreDomain`
 * are left out. Any failure returns an empty list, so the page renders without the section.
 */
export async function searchGlobalCatalog({
  query,
  limit,
  homeStoreDomain,
}: {
  query: string;
  limit: number;
  homeStoreDomain: string;
}): Promise<GlobalCatalogItem[]> {
  try {
    const response = await fetch(GLOBAL_CATALOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        id: 1,
        params: {
          name: "search_catalog",
          arguments: {
            catalog: {
              query,
              context: { address_country: "US", currency: "USD" },
              filters: { ships_to: { country: "US" }, available: true },
              pagination: { limit },
            },
            meta: { "ucp-agent": { profile: CATALOG_AGENT_PROFILE } },
          },
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return [];
    const body: unknown = await response.json();
    if (!isObject(body) || !isObject(body.result) || body.result.isError === true) return [];
    return parseCatalogItems(body.result.structuredContent).filter(
      (item) => `${item.seller.handle}${SELLER_DOMAIN_SUFFIX}` !== homeStoreDomain,
    );
  } catch {
    return [];
  }
}
