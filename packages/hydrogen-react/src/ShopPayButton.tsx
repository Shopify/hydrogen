import {defaultShopifyContext, useShop} from './ShopifyProvider.js';
import {useLoadScript} from './load-script.js';
import {parseGid} from './analytics-utils.js';

import type { JSX } from "react";

// By using 'never' in the "or" cases below, it makes these props "exclusive" and means that you cannot pass both of them; you must pass either one OR the other.
type ShopPayButtonProps = ShopPayButtonStyleProps &
  ShopPayDomainProps &
  ShopPayChannelAttribution &
  (ShopPayVariantIds | ShopPayVariantAndQuantities);

type ShopPayButtonStyleProps = {
  /** A string of classes to apply to the `div` that wraps the Shop Pay button. */
  className?: string;
  /** A string that's applied to the [CSS custom property (variable)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) `--shop-pay-button-width` for the [Buy with Shop Pay component](https://shopify.dev/custom-storefronts/tools/web-components#buy-with-shop-pay-component). */
  width?: string;
};

type ShopPayDomainProps = {
  /** The domain of your Shopify storefront URL (eg: `your-store.myshopify.com`). */
  storeDomain?: string;
};

type ShopPayVariantIds = {
  /** An array of IDs of the variants to purchase with Shop Pay. This will only ever have a quantity of 1 for each variant. If you want to use other quantities, then use `variantIdsAndQuantities`. */
  variantIds: string[];
  /** An array of variant IDs and quantities to purchase with Shop Pay. */
  variantIdsAndQuantities?: never;
};

type ShopPayVariantAndQuantities = {
  /** An array of IDs of the variants to purchase with Shop Pay. This will only ever have a quantity of 1 for each variant. If you want to use other quantities, then use `variantIdsAndQuantities`. */
  variantIds?: never;
  /** An array of variant IDs and quantities to purchase with Shop Pay. */
  variantIdsAndQuantities: Array<{
    id: string;
    quantity: number;
  }>;
};

type ShopPayChannelAttribution = {
  /** A string that adds channel attribution to the order. Can be either `headless` or `hydrogen` */
  channel?: 'headless' | 'hydrogen';
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      'shop-pay-button': {
        channel?: string;
        variants: string;
        'store-url': string;
      };
    }
  }
}

const SHOPJS_URL =
  'https://cdn.shopify.com/shopifycloud/shop-js/v1.0/client.js';

function isChannel(
  channel: string,
): channel is Exclude<ShopPayChannelAttribution['channel'], undefined> {
  return channel === 'headless' || channel === 'hydrogen';
}

/**
 * The `ShopPayButton` component renders a button that redirects to the Shop Pay checkout.
 * It renders a [`<shop-pay-button>`](https://shopify.dev/custom-storefronts/tools/web-components) custom element, for which it will lazy-load the source code automatically.
 * It relies on the `<ShopProvider>` context provider.
 */
export function ShopPayButton({
  channel,
  variantIds,
  className,
  variantIdsAndQuantities,
  width,
  storeDomain: _storeDomain,
}: ShopPayButtonProps): JSX.Element {
  const shop = useShop();
  const storeDomain = _storeDomain || shop?.storeDomain;
  const shopPayLoadedStatus = useLoadScript(SHOPJS_URL);

  let ids: string[] = [];
  let channelAttribution: string | undefined;

  if (!storeDomain || storeDomain === defaultShopifyContext.storeDomain) {
    throw new Error(MissingStoreDomainErrorMessage);
  }

  if (variantIds && variantIdsAndQuantities) {
    throw new Error(DoublePropsErrorMessage);
  }

  if (!variantIds && !variantIdsAndQuantities) {
    throw new Error(MissingPropsErrorMessage);
  }

  if (channel) {
    if (isChannel(channel)) {
      channelAttribution = channel;
    } else {
      throw new Error(InvalidChannelErrorMessage);
    }
  }

  if (variantIds) {
    ids = variantIds.reduce<string[]>((prev, curr) => {
      const bareId = parseGid(curr).id;
      if (bareId) {
        prev.push(bareId);
      }
      return prev;
    }, []);
  } else if (variantIdsAndQuantities) {
    ids = variantIdsAndQuantities.reduce<string[]>((prev, curr) => {
      const bareId = parseGid(curr?.id).id;
      if (bareId) {
        prev.push(`${bareId}:${curr?.quantity ?? 1}`);
      }
      return prev;
    }, []);
  } else {
    throw new Error(MissingPropsErrorMessage);
  }

  if (ids.length === 0) {
    throw new Error(InvalidPropsErrorMessage);
  }

  const style = width
    ? ({
        '--shop-pay-button-width': width,
      } as React.CSSProperties)
    : undefined;

  return (
    <div className={className} style={style}>
      {shopPayLoadedStatus === 'done' && (
        <shop-pay-button
          {...(channelAttribution ? {channel: channelAttribution} : {})}
          store-url={storeDomain}
          variants={ids.join(',')}
        />
      )}
    </div>
  );
}

export const MissingStoreDomainErrorMessage =
  'You must pass a "storeDomain" prop to the "ShopPayButton" component, or wrap it in a "ShopifyProvider" component.';
export const InvalidPropsErrorMessage = `You must pass in "variantIds" in the form of ["gid://shopify/ProductVariant/1"]`;
export const MissingPropsErrorMessage = `You must pass in either "variantIds" or "variantIdsAndQuantities" to ShopPayButton`;
export const DoublePropsErrorMessage = `You must provide either a variantIds or variantIdsAndQuantities prop, but not both in the ShopPayButton component`;
export const InvalidChannelErrorMessage = `Invalid channel attribution value. Must be either "headless" or "hydrogen"`;
