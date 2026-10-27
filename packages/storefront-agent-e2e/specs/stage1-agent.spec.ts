import { runAgent } from "../src/agent";
import { captureCheckout, redactCartKeys } from "../src/checkout";
import { classify } from "../src/classify";
import { CDP_PORT } from "../src/config";
import { expect, test } from "../src/fixtures";
import { readModelConfig } from "../src/model-config";
import { findShortcuts } from "../src/shortcuts";
import { verifyCart } from "../src/verify";

// Stage 1: an agent with user-only tools attempts the task; the verifier decides.
// STOREFRONT_AGENT_START picks the start point: "product" (default variant page) or "home".
const START = process.env.STOREFRONT_AGENT_START === "home" ? "home" : "product";
const MAX_STEPS = Number(process.env.STOREFRONT_AGENT_MAX_STEPS ?? "150");

test(`agent run from ${START}`, async ({ page, task }, testInfo) => {
  const model = readModelConfig();
  const checkout = await captureCheckout(page.context());
  // The only navigation the harness performs; the agent takes over from here.
  await page.goto(START === "home" ? "/" : `/products/${task.productHandle}`);
  if (process.env.STOREFRONT_AGENT_DEBUG === "1") console.log("[spec] start page loaded");

  const run = await runAgent({
    page,
    cdpUrl: `http://127.0.0.1:${CDP_PORT}`,
    goal: task.goal,
    model,
    maxSteps: MAX_STEPS,
  });

  const checkoutUrl = checkout.url();
  const state = await verifyCart(task, checkoutUrl);
  const shortcuts = findShortcuts(run.steps);
  const outcome = classify(run.claim, state, { usedShortcut: shortcuts.length > 0 });

  const report = redactCartKeys(
    JSON.stringify(
      {
        outcome,
        claim: run.claim,
        reason: run.reason,
        shortcuts,
        state,
        start: START,
        model: model.name,
        goal: task.goal,
        stepCount: run.steps.length,
        durationMs: run.durationMs,
        usage: run.usage,
        navigations: run.navigations,
        checkoutUrl,
        steps: run.steps,
      },
      null,
      2,
    ),
  );
  await testInfo.attach("run.json", { body: report, contentType: "application/json" });
  for (const [index, screenshot] of run.screenshots.entries()) {
    await testInfo.attach(`agent-screenshot-${String(index + 1).padStart(2, "0")}.png`, {
      body: screenshot,
      contentType: "image/png",
    });
  }

  // Record-only for the spike matrix: the outcome is the result, not a test assertion,
  // but a broken harness (no steps at all) should still fail loudly.
  expect(run.steps.length, report).toBeGreaterThan(0);
});
