export default defineNuxtPlugin(() => {
  const event = useRequestEvent();
  if (!event?.context.storefrontClient) {
    throw new Error("Storefront client was not created for this server request.");
  }

  return {
    provide: {
      storefrontClient: event.context.storefrontClient,
      storefrontRequestContext: event.context.storefrontRequestContext,
    },
  };
});
