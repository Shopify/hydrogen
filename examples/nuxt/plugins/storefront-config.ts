import type { StorefrontModeConfig } from "../storefront/storefront-config";

export default defineNuxtPlugin((nuxtApp) => {
  const storefrontConfig = useState<StorefrontModeConfig>("storefront-config");

  if (nuxtApp.ssrContext) {
    const requestConfig = nuxtApp.ssrContext.event.context.storefrontConfig;
    if (!requestConfig) {
      throw new Error("Storefront configuration was not created for this server request.");
    }

    storefrontConfig.value = {
      mode: requestConfig.mode,
      storeDomain: requestConfig.storeDomain,
    };
    return;
  }

  if (!storefrontConfig.value) {
    throw new Error("Storefront configuration is missing from the server payload.");
  }
});
