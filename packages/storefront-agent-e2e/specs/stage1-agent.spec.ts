import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runAgent } from "../src/agent";
import { captureCheckout, redactCartKeys } from "../src/checkout";
import { classify } from "../src/classify";
import { generateSpec } from "../src/codegen";
import { CDP_PORT } from "../src/config";
import { estimateCostUsd } from "../src/cost";
import { expect, test } from "../src/fixtures";
import { readModelConfig } from "../src/model-config";
import { recordClicks } from "../src/recorder";
import { findShortcuts } from "../src/shortcuts";
import { verifyCart } from "../src/verify";

// Stage 1: an agent with user-only tools attempts the task; the verifier decides.
// STOREFRONT_AGENT_START picks the start point: "product" (default variant page) or "home".
// STOREFRONT_AGENT_GENERATE=1 also writes a deterministic replay spec when the run passes.
const START = process.env.STOREFRONT_AGENT_START === "home" ? "home" : "product";
const MAX_STEPS = Number(process.env.STOREFRONT_AGENT_MAX_STEPS ?? "150");
// Below the 15-minute test timeout, so a stuck agent still reports its steps, cost and verdict.
const MAX_MINUTES = Number(process.env.STOREFRONT_AGENT_MAX_MINUTES ?? "10");
const GENERATE = process.env.STOREFRONT_AGENT_GENERATE === "1";
const GENERATED_DIR = fileURLToPath(new URL("../generated", import.meta.url));

test(`agent run from ${START}`, async ({ page, task }, testInfo) => {
  const model = readModelConfig();
  const checkout = await captureCheckout(page.context());
  // Always record click targets: they label the journey report; generation also uses them.
  const recording = await recordClicks(page.context());
  const startPath = START === "home" ? "/" : `/products/${task.productHandle}`;
  // The only navigation the harness performs; the agent takes over from here.
  await page.goto(startPath);
  if (process.env.STOREFRONT_AGENT_DEBUG === "1") console.log("[spec] start page loaded");

  const run = await runAgent({
    page,
    cdpUrl: `http://127.0.0.1:${CDP_PORT}`,
    goal: task.goal,
    model,
    maxSteps: MAX_STEPS,
    maxDurationMs: MAX_MINUTES * 60_000,
  });

  const checkoutUrl = checkout.url();
  const state = await verifyCart(task, checkoutUrl);
  const shortcuts = findShortcuts(run.steps);
  const outcome = classify(run.claim, state, { usedShortcut: shortcuts.length > 0 });

  let generatedFile: string | null = null;
  if (GENERATE && outcome === "PASS") {
    const source = generateSpec({
      task,
      startPath,
      startLabel: START,
      steps: run.steps,
      clicks: recording.clicks(),
      model: model.name,
    });
    mkdirSync(GENERATED_DIR, { recursive: true });
    generatedFile = path.join(GENERATED_DIR, `add-to-cart-${START}.spec.ts`);
    writeFileSync(generatedFile, source);
    await testInfo.attach("generated.spec.ts", { body: source, contentType: "text/plain" });
  }

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
        cost: estimateCostUsd(model.name, run.usage),
        thoughts: run.thoughts,
        navigations: run.navigations,
        checkoutUrl,
        generatedFile,
        clicks: recording.clicks(),
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
