import { test as base } from "@playwright/test";

import { readRunConfig } from "./config";
import { resolveLanguage } from "./language";
import { resolveMarket } from "./market";
import {
  generateAddToCartTask,
  generateFindProductTask,
  type AddToCartTask,
  type FindProductTask,
} from "./task";

export const TASK_QUANTITY = 2;

async function taskOptions() {
  const { storefrontBaseUrl, shopDomain, countryOverride, seed } = readRunConfig();
  const market = await resolveMarket({ shopDomain, override: countryOverride });
  const language = await resolveLanguage({
    storefrontBaseUrl,
    shopDomain,
    country: market.country,
    override: process.env.STOREFRONT_LANGUAGE?.trim() || undefined,
  });
  return { shopDomain, market, language, seed };
}

// Worker-scoped and lazy: a spec only pays for discovering the task it uses.
export const test = base.extend<
  {},
  { addToCartTask: AddToCartTask; findProductTask: FindProductTask }
>({
  addToCartTask: [
    async ({ browserName: _browserName }, use) => {
      await use(await generateAddToCartTask({ ...(await taskOptions()), quantity: TASK_QUANTITY }));
    },
    { scope: "worker" },
  ],
  findProductTask: [
    async ({ browserName: _browserName }, use) => {
      await use(await generateFindProductTask(await taskOptions()));
    },
    { scope: "worker" },
  ],
});

export { expect } from "@playwright/test";
