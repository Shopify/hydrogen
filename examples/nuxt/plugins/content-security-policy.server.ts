import { createContentSecurityPolicy } from "@shopify/hydrogen";

export default defineNuxtPlugin((nuxtApp) => {
  const ssrContext = nuxtApp.ssrContext;
  const requestContext = ssrContext?.event.context.shopifyRequestContext;
  const storefront = ssrContext?.event.context.storefrontConfig;
  if (!ssrContext || !requestContext || !storefront) {
    throw new Error("Shopify request context was not created for this document.");
  }

  const { nonce } = createContentSecurityPolicy({
    requestContext,
    shop: { storeDomain: storefront.storeDomain },
  });
  ssrContext.event.context.cspNonce = nonce;

  // Nuxt adds its payload and hydration scripts to Unhead after rendering the app.
  // Only touch trusted head entries; rendered body HTML may contain merchant content.
  ssrContext.head.hooks.hook("tags:afterResolve", ({ tags }) => {
    for (const tag of tags) {
      if (tag.tag === "script") tag.props.nonce = nonce;
    }
  });
});
