const DEFAULT_SIGN_IN_URL = "/account/login";
const AVATAR_SIZE = "var(--shopify-account-avatar-size, 44px)";
const SIGNED_OUT_AVATAR_SLOT = "signed-out-avatar";
export const ACCOUNT_WIDGET_ATTRIBUTE = "data-hydrogen-account-widget";

/** Reserves the host and avatar footprint so upgrading the element does not shift the header. */
export const ACCOUNT_WIDGET_STYLES =
  `[${ACCOUNT_WIDGET_ATTRIBUTE}]{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:${AVATAR_SIZE};height:${AVATAR_SIZE};vertical-align:middle}` +
  `[${ACCOUNT_WIDGET_ATTRIBUTE}]>[slot=${SIGNED_OUT_AVATAR_SLOT}]{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:${AVATAR_SIZE};height:${AVATAR_SIZE}}`;

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
   * The token is serialised into HTML and visible in the browser; pass only the
   * current access token from `getAccessToken()`, never the session, refresh
   * token or ID token, and keep the response private via the request context.
   */
  customerAccessToken?: string | null;
  /**
   * Handle of the menu shown in the account sheet, for example
   * `"customer-account-main-menu"`. Omit it to use Shopify's default menu.
   */
  menu?: string;
  /**
   * Route that starts the Customer Account login flow. Shopify appends the
   * query parameters that must be forwarded to the authorization request.
   * Defaults to `"/account/login"`.
   */
  signInUrl?: string;
  /** Content Security Policy nonce applied to the emitted `<style>` element. */
  nonce?: string;
  /**
   * Trusted HTML for the avatar shown while the customer is signed out and
   * before Shopify's component loads. The avatar is visual only: Hydrogen
   * wraps it in the `signed-out-avatar` slot with `aria-hidden="true"`, so it
   * must not carry interactive or accessible content. Hydrogen does **not**
   * escape it: pass only markup the application owns, never user-controlled
   * HTML.
   */
  signedOutAvatarHtml: string;
};

/**
 * Options shared by every account widget renderer. Framework bindings supply
 * the signed-out avatar through the React `signedOutAvatar` prop or the Vue
 * `signed-out-avatar` named slot instead of `signedOutAvatarHtml`.
 */
export type ShopifyAccountWidgetStructureOptions = Omit<
  ShopifyAccountWidgetOptions,
  "signedOutAvatarHtml"
>;

/**
 * Raw attribute values for an element descriptor. The string renderer emits
 * the empty `data-hydrogen-account-widget` owner marker as a bare attribute;
 * other attributes use `name="value"`, including empty strings. Consumers must
 * escape values when serialising to HTML.
 */
export type ShopifyAccountWidgetAttributes = Readonly<Record<string, string>>;

export type ShopifyAccountWidgetElementDescriptor<TagName extends string> = {
  readonly tagName: TagName;
  readonly attributes: ShopifyAccountWidgetAttributes;
};

export type ShopifyAccountWidgetStyleDescriptor = ShopifyAccountWidgetElementDescriptor<"style"> & {
  /** Raw CSS text for the `<style>` element. Must not be HTML-escaped. */
  readonly textContent: string;
};

/**
 * Framework-agnostic description of the account widget markup. The intended
 * DOM nesting is `store > account > (style, avatar)`, where the avatar
 * descriptor wraps the caller-provided signed-out avatar content.
 *
 * @internal Shared by the string renderer and framework bindings. Not part of
 * the public `@shopify/hydrogen` API.
 */
export type ShopifyAccountWidgetStructure = {
  readonly store: ShopifyAccountWidgetElementDescriptor<"shopify-store">;
  readonly account: ShopifyAccountWidgetElementDescriptor<"shopify-account">;
  readonly style: ShopifyAccountWidgetStyleDescriptor;
  readonly avatar: ShopifyAccountWidgetElementDescriptor<"span">;
};

/**
 * Builds the element descriptors that every account widget renderer shares:
 * element names, the Hydrogen owner marker, attribute defaults and trimming,
 * the CSP nonce, the slot/`aria-hidden` avatar wrapper, and the footprint CSS.
 *
 * @internal Consumed by `renderShopifyAccountWidget` and the framework
 * bindings so structure, attributes, defaults and CSS live in one place.
 */
export function getShopifyAccountWidgetStructure(
  options: ShopifyAccountWidgetStructureOptions,
): ShopifyAccountWidgetStructure {
  return {
    store: {
      tagName: "shopify-store",
      attributes: getShopifyStoreAttributes(options),
    },
    account: {
      tagName: "shopify-account",
      attributes: getShopifyAccountAttributes(options),
    },
    style: {
      tagName: "style",
      attributes: hasContent(options.nonce) ? { nonce: options.nonce.trim() } : {},
      textContent: ACCOUNT_WIDGET_STYLES,
    },
    avatar: {
      tagName: "span",
      attributes: { slot: SIGNED_OUT_AVATAR_SLOT, "aria-hidden": "true" },
    },
  };
}

/**
 * Renders Shopify's `<shopify-account>` component and its `<shopify-store>`
 * configuration as an HTML string for server rendering. The signed-out avatar
 * is visible before the account bundle loads and its footprint stays reserved
 * while Shopify upgrades the element. Load the bundle by enabling
 * `account` in `ShopifyScripts`.
 *
 * @see {@link https://shopify.dev/docs/api/storefront-web-components/components/shopify-account | shopify-account}
 */
export function renderShopifyAccountWidget(options: ShopifyAccountWidgetOptions): string {
  const { store, account, style, avatar } = getShopifyAccountWidgetStructure(options);

  return (
    openTag(store) +
    openTag(account) +
    openTag(style) +
    style.textContent +
    closeTag(style) +
    openTag(avatar) +
    options.signedOutAvatarHtml +
    closeTag(avatar) +
    closeTag(account) +
    closeTag(store)
  );
}

function getShopifyStoreAttributes(
  options: ShopifyAccountWidgetStructureOptions,
): Record<string, string> {
  const attributes: Record<string, string> = {
    "store-domain": options.storeDomain,
    "public-access-token": options.publicAccessToken,
  };
  if (options.customerAccessToken != null) {
    attributes["customer-access-token"] = options.customerAccessToken;
  }
  return attributes;
}

function getShopifyAccountAttributes(
  options: ShopifyAccountWidgetStructureOptions,
): Record<string, string> {
  const attributes: Record<string, string> = {
    [ACCOUNT_WIDGET_ATTRIBUTE]: "",
    "sign-in-url": hasContent(options.signInUrl) ? options.signInUrl.trim() : DEFAULT_SIGN_IN_URL,
  };
  if (hasContent(options.menu)) attributes.menu = options.menu.trim();
  return attributes;
}

function hasContent(value: string | undefined): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openTag(descriptor: ShopifyAccountWidgetElementDescriptor<string>): string {
  const attributes = serializeAttributes(descriptor.attributes);
  return attributes === "" ? `<${descriptor.tagName}>` : `<${descriptor.tagName} ${attributes}>`;
}

function closeTag(descriptor: ShopifyAccountWidgetElementDescriptor<string>): string {
  return `</${descriptor.tagName}>`;
}

function serializeAttributes(attributes: ShopifyAccountWidgetAttributes): string {
  return Object.entries(attributes)
    .map(([name, value]) =>
      name === ACCOUNT_WIDGET_ATTRIBUTE && value === ""
        ? name
        : `${name}="${escapeAttribute(value)}"`,
    )
    .join(" ");
}
