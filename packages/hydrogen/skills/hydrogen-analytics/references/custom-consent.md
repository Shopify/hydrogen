# Custom Consent Providers

Read this when connecting a third-party banner or app-owned consent UI through `consent: {mode: "custom-banner", setup}`. Other consent modes do not accept `setup`.

## Setup Contract

Hydrogen calls `setup()` without arguments in the browser after Shopify's Customer Privacy API loads. Use `window.Shopify.customerPrivacy` directly. Destination events stay buffered from the inline bootstrap through hydration until the setup promise resolves, even if Shopify's regional defaults allow tracking.

The promise is the readiness signal. Subscribe to provider changes before reading saved consent, wait for a resolved provider choice or shopper interaction, and await `customerPrivacy.setTrackingConsent(choice)` before resolving setup. Registering a listener or showing a banner alone does not complete setup.

Map the provider's choice explicitly to all four boolean purposes in `ConsentPreferences`: `analytics`, `marketing`, `preferences`, and `sale_of_data`. Keep unknown provider state pending rather than submitting it as a denial. The provider owns its regional policy.

Once setup resolves, Hydrogen checks Shopify consent and replays allowed events or clears the buffer when denied. Later updates use the existing CTA consent events. This gate covers Hydrogen analytics destinations; raw subscribers and independently loaded trackers need their own consent handling.

## Integration Pattern

The provider methods, category mapping, and error handler below are app-owned adapters, not Hydrogen or provider SDK APIs. `whenConsentResolved()` waits for saved consent or interaction; `getResolvedConsent()` reads the latest choice. The subscription continues synchronizing later acceptance, rejection, and preference changes.

```tsx
<ShopifyScripts
  shop={shop}
  consent={{
    mode: "custom-banner",
    async setup() {
      const customerPrivacy = window.Shopify!.customerPrivacy!;
      const sync = async (choice) => {
        await customerPrivacy.setTrackingConsent(mapProviderConsent(choice));
      };
      const unsubscribe = provider.subscribe((choice) => {
        void sync(choice).catch(reportConsentError);
      });
      try {
        await provider.whenConsentResolved();
        await sync(provider.getResolvedConsent());
      } catch (error) {
        unsubscribe();
        throw error;
      }
    },
  }}
/>
```

Keep the callback in client code and access browser-only provider globals inside setup. In Next.js App Router, define setup in an app-owned client component that renders `ShopifyScripts`; pass serializable `shop` and `i18n` data from the server. A function prop cannot cross the server-to-client boundary. Hydrogen serializes only the consent mode into HTML and does not expose setup to analytics destinations.

For frameworks using core script helpers, pass the same consent configuration to `getShopifyScriptTags()` / `renderShopifyScriptTags()` and `initializeShopifyScripts({consent})` during browser startup.

## Lifecycle and Failures

Setup runs once per analytics bus and resolves without a return value. The first callback remains active across component unmounts, remounts, and React Strict Mode. Do not destroy the bus when a component unmounts. If your app explicitly destroys the bus, it owns disposal of its provider subscriptions.

If setup fails, Hydrogen logs the failure and leaves destination delivery blocked for that bus. Hydrogen does not automatically rerun setup. If the provider needs retries, perform them inside setup while its promise remains pending. Handle consent write failures in the app, including later updates, and release any subscriptions created by setup if it fails.
