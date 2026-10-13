/// <reference lib="es2024.promise" />

// Load Hydrogen's browser-global declarations without importing runtime code.
import type {} from "@shopify/hydrogen";

import { setTestStore, test, expect } from "../../fixtures";

setTestStore("defaultConsentAllowed_cookiesEnabled");

type ObservationWindow = typeof window & {
  consentEvents: { published: string[]; delivered: string[] };
};

test("custom setup holds analytics until the shopper's choice is synchronized", async ({
  storefront,
  page,
}) => {
  // 1. Load the actual app-owned setup callback with permissive regional defaults.
  const initialConsent = await storefront.withConsentResponse(() =>
    page.goto("/consent/custom-banner"),
  );
  const tokens = await storefront.expectAllowedConsent(initialConsent);
  const allowCookies = page.getByRole("button", { name: "Allow optional cookies" });
  await expect(allowCookies).toBeEnabled();
  expect(
    await page.evaluate(() => window.Shopify?.customerPrivacy?.analyticsProcessingAllowed()),
    "The custom setup must hold delivery even though Shopify already allows analytics",
  ).toBe(true);

  // 2. Observe the real bus through its public APIs. Raw subscribers confirm events
  // were published; the destination must receive nothing while setup is pending.
  await page.evaluate(async () => {
    const bus = window.Shopify?.analytics;
    if (!bus) throw new Error("The storefront analytics bus is missing");
    const observed: ObservationWindow["consentEvents"] = {
      published: [],
      delivered: [],
    };
    (window as ObservationWindow).consentEvents = observed;
    bus.subscribe("page_viewed", ({ url }) => observed.published.push(url ?? ""));
    bus.addDestination({
      name: "custom-consent-e2e",
      setup({ subscribe }) {
        subscribe("page_viewed", ({ url }) => observed.delivered.push(url ?? ""));
      },
    });
    await Promise.resolve();
  });

  // 3. Client navigation continues normally without resolving setup or losing
  // buffered events. The banner and its pending setup survive that navigation.
  await page.getByRole("link", { name: "Continue shopping" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect
    .poll(() => page.evaluate(() => (window as ObservationWindow).consentEvents.published.length))
    .toBeGreaterThan(0);
  await expect(allowCookies).toBeEnabled();
  expect(await page.evaluate(() => (window as ObservationWindow).consentEvents.delivered)).toEqual(
    [],
  );
  storefront.expectNoMonorailRequests();

  // 4. Hold the real consent-write response to verify setup also waits for the
  // synchronization to finish, rather than resolving as soon as the shopper clicks.
  const writeReceived = Promise.withResolvers<void>();
  const releaseWrite = Promise.withResolvers<void>();
  await page.route("**/graphql.json", async (route) => {
    const query = route.request().postDataJSON()?.query;
    if (typeof query !== "string" || !/visitorConsent:\{[^}]*analytics:true/.test(query)) {
      await route.fallback();
      return;
    }
    const response = await route.fetch();
    writeReceived.resolve();
    await releaseWrite.promise;
    await route.fulfill({ response });
  });
  try {
    await allowCookies.click();
    await writeReceived.promise;
    await expect(allowCookies).toBeDisabled();
    expect(
      await page.evaluate(() => (window as ObservationWindow).consentEvents.delivered),
    ).toEqual([]);
    storefront.expectNoMonorailRequests();
  } finally {
    releaseWrite.resolve();
  }

  // 5. Once synchronized, setup resolves and Hydrogen replays both page views.
  // The Shopify destination also emits analytics with the real tracking values.
  await expect(page.getByRole("status")).toHaveText("Your privacy choice has been saved.");
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as ObservationWindow).consentEvents.delivered.map((url) => new URL(url).pathname),
      ),
    )
    .toEqual(["/consent/custom-banner", "/"]);
  await storefront.waitForMonorailRequests();
  storefront.verifyMonorailRequests(tokens.uniqueToken, tokens.visitToken, "after custom setup");
});
