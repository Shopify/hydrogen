import { gql, type StorefrontApi, type StorefrontClient } from "@shopify/hydrogen";

import { loadAnnouncement } from "~/lib/announcement";
import { normalizeStorefrontShop, type StorefrontShop } from "~/lib/storefront-shop";

export const ROOT_LAYOUT_QUERY = gql(`
  query RootLayout {
    shop {
      name
      brand {
        logo {
          alt
          image {
            url
            altText
            width
            height
          }
        }
      }
      paymentSettings {
        acceptedCardBrands
        supportedDigitalWallets
      }
    }
    collections(first: 5) {
      nodes {
        handle
        title
      }
    }
  }
`);

export type RootLayoutQueryResult = StorefrontApi.ResultOf<typeof ROOT_LAYOUT_QUERY>;

type RootLayoutLoaderData = {
  shopInfo: StorefrontShop;
  navCollections: RootLayoutQueryResult["collections"]["nodes"];
  announcement: string | null;
};

export async function loadRootLayout(
  storefrontClient: Pick<StorefrontClient, "graphql">,
): Promise<RootLayoutLoaderData> {
  const [layoutResult, announcement] = await Promise.all([
    storefrontClient.graphql(ROOT_LAYOUT_QUERY),
    loadAnnouncement(storefrontClient),
  ]);

  if (layoutResult.errors) {
    console.error(
      `Root layout query failed: ${layoutResult.errors.map(({ message }) => message).join("\n")}`,
    );
  }

  // Upstream error details are logged above, not exposed through the boundary.
  if (!layoutResult.data) throw new Error("Root layout data is unavailable.");

  const { shop, collections } = layoutResult.data;
  return {
    shopInfo: normalizeStorefrontShop(shop),
    navCollections: collections.nodes,
    announcement,
  };
}
