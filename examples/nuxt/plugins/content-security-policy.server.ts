import { createContentSecurityPolicy } from "@shopify/hydrogen";

export default defineNuxtPlugin((nuxtApp) => {
  const ssrContext = nuxtApp.ssrContext;
  const storefront = ssrContext?.event.context.storefrontConfig;
  if (!ssrContext || !storefront) {
    throw new Error("Storefront configuration was not created for this document.");
  }

  const csp = createContentSecurityPolicy({
    shop: { storeDomain: storefront.storeDomain },
  });
  ssrContext.event.context.csp = csp;

  // Nuxt adds its payload and hydration scripts to Unhead after rendering the app.
  // Only touch trusted head entries; rendered body HTML may contain merchant content.
  ssrContext.head.hooks.hook("tags:afterResolve", ({ tags }) => {
    for (const tag of tags) {
      if (tag.tag === "script") tag.props.nonce = csp.nonce;
    }
  });
});
