import { gql, type StorefrontClient } from "@shopify/hydrogen";

export const ANNOUNCEMENT_METAFIELD_TYPE = "single_line_text_field";

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

export function parseAnnouncement(
  metafield: { type: string; value: string } | null | undefined,
): string | null {
  if (metafield?.type !== ANNOUNCEMENT_METAFIELD_TYPE) return null;
  const message = metafield.value.trim();
  return message === "" ? null : message;
}

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
