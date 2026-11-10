import type { ShopifyAttributeValue, ShopifyScriptTagDescriptor } from "./types";

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
