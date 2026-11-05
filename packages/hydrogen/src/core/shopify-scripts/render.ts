import type { ShopifyAttributeValue, ShopifyScriptTagDescriptor } from "./types";

/**
 * Returns a stable key for a script/link descriptor, for frameworks that render the descriptors as
 * a list. Optional tags come and go, so index keys would make a framework reuse already-run
 * scripts for different tags.
 */
export function getShopifyScriptTagKey(
  attributes: ShopifyScriptTagDescriptor["attributes"] = {},
): string {
  return "id" in attributes && attributes.id !== undefined
    ? attributes.id
    : `${"rel" in attributes ? attributes.rel : ""}:${"href" in attributes ? attributes.href : ""}`;
}

/**
 * Renders a Shopify script/link descriptor to an HTML string.
 */
export function renderShopifyScriptTag({
  tagName,
  attributes,
  innerHTML,
}: ShopifyScriptTagDescriptor): string {
  const serializedAttributes = Object.entries(attributes ?? {})
    .map(renderHtmlAttribute)
    .filter((attribute): attribute is string => Boolean(attribute))
    .join(" ");
  const openingTag = serializedAttributes ? `<${tagName} ${serializedAttributes}>` : `<${tagName}>`;

  if (tagName === "link") return openingTag;

  return `${openingTag}${innerHTML ?? ""}</script>`;
}

function renderHtmlAttribute([name, value]: [string, ShopifyAttributeValue]): string | undefined {
  if (value === false) return;

  const serializedName = name.toLowerCase();
  if (value === true) return serializedName;

  return `${serializedName}="${escapeHtmlAttribute(value)}"`;
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
