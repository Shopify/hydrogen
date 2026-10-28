import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, type Page, type TestInfo } from "@playwright/test";

import { runAgent } from "./agent";
import { redactCartKeys } from "./checkout";
import { classify, type VerifiedState } from "./classify";
import { generateSpec, type GeneratedTest } from "./codegen";
import { CDP_PORT } from "./config";
import { estimateCostUsd } from "./cost";
import { detectFriction } from "./friction";
import { readModelConfig } from "./model-config";
import { recordClicks } from "./recorder";
import { findShortcuts } from "./shortcuts";
import { sizeWindowToViewport } from "./viewport";

// Below the 15-minute test timeout, so a stuck agent still reports its steps, cost and verdict.
const MAX_MINUTES = Number(process.env.STOREFRONT_AGENT_MAX_MINUTES ?? "10");
const GENERATE = process.env.STOREFRONT_AGENT_GENERATE === "1";
const GENERATED_DIR = fileURLToPath(new URL("../generated", import.meta.url));

/**
 * One agent test: open the start page, let the agent work with user-only tools, then let the
 * verifier decide. Attaches run.json and the agent's screenshots for the journey report, and
 * writes a deterministic replay script when the run passes and STOREFRONT_AGENT_GENERATE=1.
 */
export async function runAgentTest(options: {
  readonly page: Page;
  readonly testInfo: TestInfo;
  readonly test: GeneratedTest;
  readonly startPath: string;
  /** The step cap when STOREFRONT_AGENT_MAX_STEPS is unset. A backstop: the prompt makes broken stores end early. */
  readonly defaultMaxSteps: number;
  /** Runs after the agent stops; reads the state the verdict is based on. */
  readonly verify: () => Promise<VerifiedState>;
}): Promise<void> {
  const { page, testInfo, test, startPath, defaultMaxSteps, verify } = options;
  const model = readModelConfig();
  const maxSteps = Number(process.env.STOREFRONT_AGENT_MAX_STEPS ?? defaultMaxSteps);
  // Always record click targets: they label the journey report; generation also uses them.
  const recording = await recordClicks(page.context());
  await sizeWindowToViewport(page);

  // The only navigation the harness performs; the agent takes over from here.
  const start = await page.goto(startPath);
  // Not every storefront serves every path. Skip rather than start the agent on an error page.
  if (start === null || start.status() >= 400) {
    testInfo.skip(
      true,
      `This storefront does not serve ${startPath} (HTTP ${start?.status() ?? "none"}).`,
    );
  }

  const run = await runAgent({
    page,
    cdpUrl: `http://127.0.0.1:${CDP_PORT}`,
    goal: test.task.goal,
    model,
    maxSteps,
    maxDurationMs: MAX_MINUTES * 60_000,
  });

  const state = await verify();
  const shortcuts = findShortcuts(run.steps);
  const outcome = classify(run.claim, state, { usedShortcut: shortcuts.length > 0 });
  const friction = outcome === "PASS" ? detectFriction(run.thoughts) : [];

  let generatedFile: string | null = null;
  if (GENERATE && outcome === "PASS") {
    const source = generateSpec({
      test,
      startPath,
      steps: run.steps,
      clicks: recording.clicks(),
      model: model.name,
    });
    mkdirSync(GENERATED_DIR, { recursive: true });
    generatedFile = path.join(GENERATED_DIR, `${test.kind}.spec.ts`);
    writeFileSync(generatedFile, source);
    await testInfo.attach("generated.spec.ts", { body: source, contentType: "text/plain" });
  }

  const report = redactCartKeys(
    JSON.stringify(
      {
        outcome,
        test: test.kind,
        claim: run.claim,
        reason: run.reason,
        shortcuts,
        friction,
        exitInterview: run.exitInterview,
        state,
        startPath,
        model: model.name,
        goal: test.task.goal,
        language: test.task.language,
        stepCount: run.steps.length,
        durationMs: run.durationMs,
        usage: run.usage,
        cost: estimateCostUsd(model.name, run.usage),
        thoughts: run.thoughts,
        navigations: run.navigations,
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
}
