import { gql, type StorefrontClient } from "@shopify/hydrogen";

// Optional announcement bar text, read from a template-defined shop metafield.
// `custom.announcement` is a convention of this template, not a native Shopify
// setting: create a SHOP metafield definition with type `single_line_text_field`
// and Storefront access `PUBLIC_READ` (see README). Without a value, no bar renders.
export const ANNOUNCEMENT_METAFIELD_TYPE = "single_line_text_field";

// Kept separate from the root layout query so a missing, restricted, or failing
// metafield can never null out the shop name, branding, payments, or navigation.
export const SHOP_ANNOUNCEMENT_QUERY = gql(`
  query ShopAnnouncement {
    shop {
      announcement: metafield(namespace: "custom", key: "announcement") {
        type
        value
      }
    }
  }
`);

/** Returns trimmed plain text for a `single_line_text_field` value, or `null`. */
export function parseAnnouncement(
  metafield: { type: string; value: string } | null | undefined,
): string | null {
  if (metafield?.type !== ANNOUNCEMENT_METAFIELD_TYPE) return null;
  const message = metafield.value.trim();
  return message === "" ? null : message;
}

/** Loads the optional announcement; any request or GraphQL failure yields `null`. */
export async function loadAnnouncement(
  storefrontClient: Pick<StorefrontClient, "graphql">,
): Promise<string | null> {
  try {
    const result = await storefrontClient.graphql(SHOP_ANNOUNCEMENT_QUERY);
    if (result.errors) {
      console.error(
        `Shop announcement query failed: ${result.errors.map(({ message }) => message).join("\n")}`,
      );
      return null;
    }
    return parseAnnouncement(result.data.shop.announcement);
  } catch (error) {
    console.error(
      `Shop announcement query failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}
