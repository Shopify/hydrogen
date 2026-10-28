import { runAgentTest } from "../src/agent-test";
import { test } from "../src/fixtures";
import { verifyProductPage } from "../src/product-page";

// T2: from the home page, find a product's page. The verdict comes from the page the agent is on
// when it stops: its main heading names the product (or, without one, the URL has the handle).
test("find a product from the home page", async ({ page, findProductTask }, testInfo) => {
  await runAgentTest({
    page,
    testInfo,
    test: { kind: "find-product", task: findProductTask },
    startPath: "/",
    // Expected to take a handful of steps; leaves room for paging or a search.
    defaultMaxSteps: 20,
    verify: () => verifyProductPage(page, findProductTask),
  });
});
