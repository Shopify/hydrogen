import { AnalyticsEventName, CartReturn, ShopifyPageViewPayload, getClientBrowserParameters, sendShopifyAnalytics, useAnalyticsProvider, useShopifyCookies } from "@shopify/hydrogen";
import { CurrencyCode, LanguageCode } from "@shopify/hydrogen/storefront-api-types";
import { useEffect, useState } from "react";
import { getCustomerPrivacyRequired } from "./ConsentManagementApi";

type ShopAnalytic = {
  shopId: string;
  acceptedLanguage: LanguageCode;
  currency: CurrencyCode;
  hydrogenSubchannelId: string;
};

export function ShopifyAnalytics({
  shopAnalytics
}: {
  shopAnalytics: Promise<ShopAnalytic | null> | ShopAnalytic | null;
}) {
  const {subscribe, canTrack} = useAnalyticsProvider();
  const hasUserConsent = canTrack();
  useShopifyCookies({hasUserConsent});
  const [shop, setShop] = useState<ShopAnalytic | null>(null);

  useEffect(() => {
    Promise.resolve(shopAnalytics).then(setShop);
    return () => {};
  }, [setShop, shopAnalytics, shop]);

  useEffect(() => {
    if (!shop) return;

    subscribe('page_viewed', () => {
      const customerPrivacy = getCustomerPrivacyRequired();
      console.log('ShopifyAnalytics - Page viewed:', customerPrivacy);

      const eventPayload: ShopifyPageViewPayload = {
        ...shop,
        hasUserConsent: customerPrivacy?.userCanBeTracked() || false,
        ...getClientBrowserParameters(),
      };

      sendShopifyAnalytics({
        eventName: AnalyticsEventName.PAGE_VIEW,
        payload: eventPayload,
      });
    });
    subscribe('product_viewed', (payload) => {
      console.log('ShopifyAnalytics - Product viewed:', payload);
    });
    subscribe('collection_viewed', (payload) => {
      console.log('ShopifyAnalytics - Collection viewed:', payload);
    });
    subscribe('cart_viewed', (payload) => {
      console.log('ShopifyAnalytics - Cart viewed:', payload);
    });
    subscribe('cart_updated', (payload) => {
      const previousCart = payload.previousCart as CartReturn;
      const currentCart = payload.currentCart as CartReturn;

      // Compare previous cart against current cart lines
      // Detect quantity changes and missing cart lines
      previousCart?.lines?.nodes?.forEach((line) => {
        const matchedLineId = currentCart?.lines.nodes.filter((currentLine) => line.id === currentLine.id);
        if (matchedLineId.length === 1) {
          const matchedLine = matchedLineId[0];
          if (line.quantity < matchedLine.quantity) {
            console.log('product_added_to_cart', {
              line,
              quantity: matchedLine.quantity,
            });
          } else if (line.quantity > matchedLine.quantity) {
            console.log('product_removed_from_cart', {
              line,
              quantity: matchedLine.quantity,
            });
          }
        } else {
          console.log('product_removed_from_cart', {
            line,
            quantity: 0,
          });
        }
      });

      // Compare current cart against previous cart lines
      // Detect new cart lines
      currentCart?.lines?.nodes?.forEach((line) => {
        const matchedLineId = previousCart?.lines.nodes.filter((previousLine) => line.id === previousLine.id);
        if (!matchedLineId || matchedLineId.length === 0) {
          console.log('product_added_to_cart', {
            line,
            quantity: 1,
          });
        }
      });

    });
  }, [shop]);

  return null;
}
