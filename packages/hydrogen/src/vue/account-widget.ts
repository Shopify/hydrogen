import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  shallowRef,
  type SlotsType,
  type VNode,
} from "vue";

import {
  getShopifyAccountWidgetStructure,
  type ShopifyAccountWidgetStructureOptions,
} from "../core/account-widget";

export type ShopifyAccountWidgetProps = ShopifyAccountWidgetStructureOptions;

export type ShopifyAccountWidgetSlots = {
  /**
   * Avatar shown while the customer is signed out and before Shopify's
   * component loads. Hydrogen wraps it in the `signed-out-avatar` slot with
   * `aria-hidden="true"`, so it must be visual only. The slot is required.
   */
  "signed-out-avatar": () => VNode[];
};

/** Handler for the `open` and `close` events dispatched by `<shopify-account>`. */
export type ShopifyAccountWidgetEventHandler = (event: CustomEvent<null>) => void;

type ShopifyAccountWidgetEventType = "open" | "close";

/** Narrows the native listener signature to the events Shopify dispatches. */
type ShopifyAccountElement = HTMLElement & {
  addEventListener(
    type: ShopifyAccountWidgetEventType,
    listener: ShopifyAccountWidgetEventHandler,
  ): void;
  removeEventListener(
    type: ShopifyAccountWidgetEventType,
    listener: ShopifyAccountWidgetEventHandler,
  ): void;
};

type CompletePropOptions<T> = {
  [K in keyof T]-?: unknown;
};

const SIGNED_OUT_AVATAR_SLOT = "signed-out-avatar";
const accountWidgetSlots: SlotsType<ShopifyAccountWidgetSlots> = {};

/**
 * Renders Shopify's `<shopify-account>` component and its `<shopify-store>`
 * configuration. Load the bundle by enabling `account` in
 * `ShopifyScripts`. Provide the signed-out avatar through the required
 * `signed-out-avatar` slot; `open` and `close` re-emit the native
 * `CustomEvent<null>` dispatched by `<shopify-account>`.
 *
 * `<shopify-store>` does not observe `customer-access-token` changes, so the
 * store subtree remounts whenever the store identity (domain, public token or
 * customer token) changes.
 *
 * @see {@link https://shopify.dev/docs/api/storefront-web-components/components/shopify-account | shopify-account}
 */
export const ShopifyAccountWidget = defineComponent(
  (props: ShopifyAccountWidgetProps, { slots, emit }) => {
    const accountRef = shallowRef<ShopifyAccountElement | null>(null);
    let listening: ShopifyAccountElement | null = null;
    const onOpen: ShopifyAccountWidgetEventHandler = (event) => emit("open", event);
    const onClose: ShopifyAccountWidgetEventHandler = (event) => emit("close", event);

    // The store key remounts <shopify-account>, so listeners follow the live node.
    function syncListeners() {
      const account = accountRef.value;
      if (account === listening) return;
      if (listening !== null) {
        listening.removeEventListener("open", onOpen);
        listening.removeEventListener("close", onClose);
      }
      listening = account;
      if (account !== null) {
        account.addEventListener("open", onOpen);
        account.addEventListener("close", onClose);
      }
    }

    onMounted(syncListeners);
    onUpdated(syncListeners);
    onBeforeUnmount(() => {
      accountRef.value = null;
      syncListeners();
    });

    return () => {
      const signedOutAvatar = slots[SIGNED_OUT_AVATAR_SLOT];
      if (signedOutAvatar === undefined) {
        throw new TypeError(
          `ShopifyAccountWidget requires the "${SIGNED_OUT_AVATAR_SLOT}" slot for the avatar shown before Shopify's component loads.`,
        );
      }

      const { store, account, style, avatar } = getShopifyAccountWidgetStructure(props);

      return h(store.tagName, { key: getStoreKey(props), ...store.attributes }, [
        h(account.tagName, { ref: accountRef, ...account.attributes }, [
          h(style.tagName, { ...style.attributes, innerHTML: style.textContent }),
          h(avatar.tagName, avatar.attributes, signedOutAvatar()),
        ]),
      ]);
    };
  },
  {
    name: "ShopifyAccountWidget",
    inheritAttrs: false,
    props: {
      storeDomain: { type: String, required: true },
      publicAccessToken: { type: String, required: true },
      customerAccessToken: null,
      menu: String,
      signInUrl: String,
      nonce: String,
    } satisfies CompletePropOptions<ShopifyAccountWidgetProps>,
    emits: {
      open: (event: CustomEvent<null>) => event.type === "open",
      close: (event: CustomEvent<null>) => event.type === "close",
    },
    slots: accountWidgetSlots,
  },
);

/**
 * `null` and `undefined` share the signed-out identity; an empty-string token
 * is a distinct (present) identity, matching the emitted attribute.
 */
function getStoreKey(options: ShopifyAccountWidgetStructureOptions): string {
  const token = options.customerAccessToken == null ? "" : `:${options.customerAccessToken}`;
  return `${options.storeDomain}\n${options.publicAccessToken}\n${token}`;
}
