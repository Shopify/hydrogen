import {
  computed,
  defineComponent,
  inject,
  provide,
  toRef,
  watchEffect,
  type ComputedRef,
  type InjectionKey,
  type PropType,
  type Ref,
} from "vue";

import type { ShopifyMatchedLocale } from "../core/i18n/types";
import {
  warnOnLocalePathPrefixMismatch,
  warnOnMissingLocaleProvider,
} from "../core/shopify-scripts/locale-checks";

const LocaleKey: InjectionKey<Readonly<Ref<ShopifyMatchedLocale>>> = Symbol("Locale");

const localeProp: PropType<ShopifyMatchedLocale> = Object;

/**
 * Shares the request's locale with your app, so requests from the browser stay in the customer's locale.
 *
 * Below the provider, `useLocale` returns the locale. The cart and predictive search providers send their requests under the locale's path prefix, such as `/fr-ca/api/cart`, and cart and search forms post under the same prefix. Render the provider above both, and pass the same locale to `ShopifyScripts`. A storefront with one locale doesn't need the provider.
 *
 * Hydrogen keeps one locale per page load. Change locale with a full page load, such as a plain link built with `getLocalizedHref`, so Shopify's scripts and the cart start again in the new locale.
 *
 * @example
 * ```vue
 * <LocaleProvider :locale="locale">
 *   <CartProvider :initialData="cartData">
 *     <App />
 *   </CartProvider>
 * </LocaleProvider>
 * ```
 * @publicDocs
 */
export const LocaleProvider = defineComponent({
  name: "LocaleProvider",
  props: {
    locale: {
      type: localeProp,
      required: true as const,
    },
  },
  setup(props, { slots }) {
    const locale = toRef(props, "locale");
    provide(LocaleKey, locale);

    if (__DEV__) watchEffect(() => warnOnLocalePathPrefixMismatch(locale.value.pathPrefix));

    return () => slots.default?.();
  },
});

/**
 * Returns the locale that the server resolved for the request as a read-only ref: the language, the country, and the path prefix.
 *
 * Add the path prefix to your own links and requests to keep them in the customer's locale. The prefix is empty for the default locale and for locales with their own domain. The composable throws outside the locale provider.
 *
 * @example
 * ```vue
 * <script setup>
 * const locale = useLocale();
 * </script>
 *
 * <template>
 *   <a :href="`${locale.pathPrefix}/collections`">Collections</a>
 * </template>
 * ```
 * @publicDocs
 */
export function useLocale(): Readonly<Ref<ShopifyMatchedLocale>> {
  const locale = inject(LocaleKey, null);
  if (!locale) throw new Error("useLocale must be used inside a <LocaleProvider>.");
  return locale;
}

/**
 * The path prefix that the cart and predictive search providers send requests under. Without a
 * provider the storefront has one locale, so there is no prefix.
 */
export function useLocalePathPrefix(): ComputedRef<string | undefined> {
  const locale = inject(LocaleKey, null);
  if (__DEV__ && !locale) warnOnMissingLocaleProvider();

  return computed(() => locale?.value.pathPrefix);
}
