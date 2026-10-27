import { test as base } from "@playwright/test";

import { readRunConfig } from "./config";
import { generateAddToCartTask, type AddToCartTask } from "./task";

export const TASK_QUANTITY = 2;

export const test = base.extend<{}, { task: AddToCartTask }>({
  task: [
    async ({ browserName: _browserName }, use) => {
      const { shopDomain, country, seed } = readRunConfig();
      await use(
        await generateAddToCartTask({ shopDomain, country, quantity: TASK_QUANTITY, seed }),
      );
    },
    { scope: "worker" },
  ],
});

export { expect } from "@playwright/test";
