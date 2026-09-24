import { escapeAttribute, hasContent } from "../html";

const DEFAULT_SIGN_IN_PATH = "/account/login";
const AVATAR_SIZE = "var(--shopify-account-avatar-size, 44px)";
export const ACCOUNT_WIDGET_ATTRIBUTE = "data-hydrogen-account-widget";

/** Reserves the host and avatar footprint so upgrading the element does not shift the header. */
export const ACCOUNT_WIDGET_STYLES =
  `[${ACCOUNT_WIDGET_ATTRIBUTE}]{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:${AVATAR_SIZE};height:${AVATAR_SIZE};vertical-align:middle}` +
  `[${ACCOUNT_WIDGET_ATTRIBUTE}]>[slot=signed-out-avatar]{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:${AVATAR_SIZE};height:${AVATAR_SIZE}}`;

export type ShopifyAccountWidgetOptions = {
  /** The store's myshopify.com domain, for example `"your-store.myshopify.com"`. */
  storeDomain: string;
  /**
   * Public Storefront API access token from the Headless or Hydrogen channel.
   * The token is serialised into HTML, so never pass a private token.
   */
  publicAccessToken: string;
  /**
   * Customer Account API access token for the signed-in customer. Omit it, or
   * pass `null`, for signed-out customers so Shopify renders the signed-out slot.
   * Blank (empty or whitespace-only) tokens are treated as omitted; non-blank
   * tokens are emitted verbatim.
   * Responses containing this token must not be shared-cacheable.
   */
  customerAccessToken?: string | null;
  /**
   * Handle of the menu shown in the account sheet, for example
   * `"customer-account-main-menu"`. Omit it to use Shopify's default menu.
   */
  menu?: string;
  /**
   * Root-relative Customer Account login path. Defaults to `"/account/login"`.
   * Invalid paths throw a `TypeError`.
   * Forward Shopify's appended query parameters to the authorization request.
   */
  signInPath?: string;
  /** Content Security Policy nonce applied to the emitted `<style>` element. */
  nonce?: string;
  /**
   * Trusted HTML for the avatar shown while the customer is signed out and
   * before Shopify's component loads. Hydrogen wraps it in the
   * `signed-out-avatar` slot and does **not** escape it: pass only markup the
   * application owns, never user-controlled HTML.
   */
  signedOutAvatarHtml: string;
};

/**
 * Renders Shopify's `<shopify-account>` component and its `<shopify-store>`
 * configuration as an HTML string for server rendering. The signed-out avatar
 * is visible before the account bundle loads and its footprint stays reserved
 * while Shopify upgrades the element.
 *
 * Override `--shopify-account-avatar-size` to change the reserved footprint.
 * Load the bundle by enabling `account` in `ShopifyScripts`.
 *
 * @see {@link https://shopify.dev/docs/api/storefront-web-components/components/shopify-account | shopify-account}
 */
export function renderShopifyAccountWidget(options: ShopifyAccountWidgetOptions): string {
  const store = serializeAttributes(getShopifyStoreAttributes(options));
  const account = serializeAttributes(getShopifyAccountAttributes(options));
  const nonce = hasContent(options.nonce)
    ? ` nonce="${escapeAttribute(options.nonce.trim())}"`
    : "";

  return (
    `<shopify-store ${store}>` +
    `<shopify-account ${ACCOUNT_WIDGET_ATTRIBUTE} ${account}>` +
    `<style${nonce}>${ACCOUNT_WIDGET_STYLES}</style>` +
    `<span slot="signed-out-avatar" aria-hidden="true">${options.signedOutAvatarHtml}</span>` +
    `</shopify-account>` +
    `</shopify-store>`
  );
}

function getShopifyStoreAttributes(options: ShopifyAccountWidgetOptions): Record<string, string> {
  const attributes: Record<string, string> = {
    "store-domain": options.storeDomain,
    "public-access-token": options.publicAccessToken,
  };
  const customerAccessToken = options.customerAccessToken ?? undefined;
  if (hasContent(customerAccessToken)) {
    attributes["customer-access-token"] = customerAccessToken;
  }
  return attributes;
}

function getShopifyAccountAttributes(options: ShopifyAccountWidgetOptions): Record<string, string> {
  const signInPath = hasContent(options.signInPath)
    ? options.signInPath.trim()
    : DEFAULT_SIGN_IN_PATH;
  if (
    !signInPath.startsWith("/") ||
    signInPath.startsWith("//") ||
    // oxlint-disable-next-line no-control-regex -- rejecting ASCII control characters is intentional
    /[\\\u0000-\u001f\u007f]/.test(signInPath)
  ) {
    throw new TypeError(
      'signInPath must be a root-relative path starting with a single "/" and containing no backslashes or ASCII control characters.',
    );
  }
  const attributes: Record<string, string> = { "sign-in-url": signInPath };
  if (hasContent(options.menu)) attributes.menu = options.menu.trim();
  return attributes;
}

function serializeAttributes(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
    .join(" ");
}
