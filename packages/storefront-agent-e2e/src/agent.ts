import { Stagehand, type AgentEvidenceEvent } from "@browserbasehq/stagehand";
import type { Page } from "@playwright/test";
import { z } from "zod";

import type { AgentClaim } from "./classify";
import { exitInterview, type ExitInterview } from "./exit-interview";
import { startMeteringProxy } from "./metering-proxy";

export type ModelConfig = {
  /** Provider-prefixed model name, e.g. "anthropic/claude-haiku-5-5". */
  readonly name: string;
  readonly url: string;
  readonly token: string;
};

export type AgentStep = {
  readonly action: string;
  readonly args: Record<string, unknown>;
  readonly reasoning: string;
  readonly ok: boolean;
  readonly error?: string;
  /** Index into AgentRun.screenshots of the screenshot this step was decided from. */
  readonly screenshotIndex?: number;
};

export type TokenUsage = {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedInputTokens: number;
};

export type AgentRun = {
  readonly claim: AgentClaim;
  readonly reason: string;
  readonly steps: readonly AgentStep[];
  /** Every main-frame URL the page navigated to, in order. */
  readonly navigations: readonly string[];
  readonly screenshots: readonly Buffer[];
  readonly usage: TokenUsage | null;
  /** Text the model wrote between actions, in order. */
  readonly thoughts: readonly string[];
  /** The agent's own diagnosis when it ran out of steps or time without finishing. */
  readonly exitInterview: ExitInterview | null;
  readonly durationMs: number;
};

const SHOPPER_SYSTEM_PROMPT = `You are a shopper using an online store in a web browser.
You only see screenshots, and you only use the mouse and keyboard, like a normal customer.
Never type a web address; get around the store using what is on the page.
After each action, look at the new screenshot to confirm it worked before moving on.
When the whole task is complete, call the finish tool with status "done".
If the store contradicts what you just did (for example the cart shows a different item, size or
quantity than you added, an error appears, or a button does nothing), retry once. If it happens
again, call the finish tool with status "blocked" right away and describe what you saw.
Do not look for workarounds: report the problem instead.
Keep the store's country, language and currency unless the task asks you to change them.
Nobody will answer questions, so do not ask any.`;

const finishInput = z.object({
  status: z.enum(["done", "blocked"]),
  reason: z.string().describe("One sentence on what happened."),
});

// Stagehand connects over the browser's WebSocket endpoint, which Chrome publishes here.
async function browserWebSocketUrl(cdpHttpUrl: string): Promise<string> {
  const response = await fetch(new URL("/json/version", cdpHttpUrl), {
    signal: AbortSignal.timeout(5_000),
  });
  const body: unknown = await response.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("webSocketDebuggerUrl" in body) ||
    typeof body.webSocketDebuggerUrl !== "string"
  ) {
    throw new Error(`No webSocketDebuggerUrl at ${cdpHttpUrl}/json/version`);
  }
  return body.webSocketDebuggerUrl;
}

// A leftover browser can hold the CDP port; the new one then fails to bind it silently and
// Stagehand would attach to the wrong browser. Check the page is really there first.
async function assertBrowserOwnsPage(cdpHttpUrl: string, pageUrl: string): Promise<void> {
  const response = await fetch(new URL("/json/list", cdpHttpUrl), {
    signal: AbortSignal.timeout(5_000),
  });
  const targets: unknown = await response.json();
  const urls = Array.isArray(targets)
    ? targets.flatMap((t) =>
        typeof t === "object" && t !== null && "url" in t ? [String(t.url)] : [],
      )
    : [];
  if (!urls.includes(pageUrl)) {
    throw new Error(
      `The browser on ${cdpHttpUrl} does not have ${pageUrl} open. Another browser is probably holding the CDP port; stop it or set STOREFRONT_AGENT_CDP_PORT.`,
    );
  }
}

// The model must see the whole viewport it acts on. A mismatch (e.g. viewport emulation on a
// smaller real window) silently hides the bottom of the page, such as a cart's checkout button.
async function assertScreenshotMatchesViewport(stagehand: Stagehand): Promise<void> {
  const page = await stagehand.context.awaitActivePage();
  const viewport = String(await page.mainFrame().evaluate("`${innerWidth}x${innerHeight}`"));
  const shot = await page.screenshot({ fullPage: false });
  const size = `${shot.readUInt32BE(16)}x${shot.readUInt32BE(20)}`;
  if (size !== viewport) {
    throw new Error(
      `Agent screenshots are ${size} but the page viewport is ${viewport}; the model would not see the whole page.`,
    );
  }
}

export async function runAgent(options: {
  page: Page;
  cdpUrl: string;
  goal: string;
  model: ModelConfig;
  maxSteps: number;
  /** Wall-clock budget. Keep it below the test timeout so a stuck run still reports its data. */
  maxDurationMs: number;
}): Promise<AgentRun> {
  const { page, cdpUrl, goal, model, maxSteps, maxDurationMs } = options;
  const startedAt = Date.now();
  const log = (message: string) => {
    if (process.env.STOREFRONT_AGENT_DEBUG === "1")
      console.log(`[agent +${Date.now() - startedAt}ms] ${message}`);
  };
  const steps: AgentStep[] = [];
  const screenshots: Buffer[] = [];
  const navigations: string[] = [];
  const recorded: { finish: z.infer<typeof finishInput> | null } = { finish: null };

  const onNavigated = (frame: { parentFrame(): unknown; url(): string }) => {
    if (frame.parentFrame() === null) navigations.push(frame.url());
  };
  page.on("framenavigated", onNavigated);

  await assertBrowserOwnsPage(cdpUrl, page.url());
  const meter = await startMeteringProxy(model.url);
  const stagehand = new Stagehand({
    env: "LOCAL",
    localBrowserLaunchOptions: { cdpUrl: await browserWebSocketUrl(cdpUrl) },
    disableAPI: true,
    // Custom agent tools (our finish tool) are gated behind this flag in Stagehand v3.
    experimental: true,
    disablePino: true,
    serverCache: false,
    verbose: 0,
  });

  // Stagehand v3 rejects abort signals in CUA mode, so race the run against the budget and close
  // Stagehand's browser connection when it runs out (the same approach TaleSpin's driver uses).
  let budgetTimer: ReturnType<typeof setTimeout> | undefined;
  const budgetExpired = new Promise<never>((_resolve, reject) => {
    budgetTimer = setTimeout(() => {
      reject(new Error(`time budget of ${Math.round(maxDurationMs / 60_000)} min reached`));
      void stagehand.close().catch(() => undefined);
    }, maxDurationMs);
  });
  budgetExpired.catch(() => undefined);
  const result = (
    claim: AgentClaim,
    reason: string,
    interview: ExitInterview | null = null,
  ): AgentRun => ({
    claim,
    reason,
    exitInterview: interview,
    steps,
    navigations,
    screenshots,
    usage: meter.usage(),
    thoughts: meter.thoughts(),
    durationMs: Date.now() - startedAt,
  });

  // Ran out of steps or time without calling finish: ask once whether the store stopped it.
  const unfinished = async (why: string, fallback: string): Promise<AgentRun> => {
    const interview = await exitInterview({
      model,
      baseUrl: meter.url,
      goal,
      why,
      thoughts: meter.thoughts(),
      lastScreenshot: screenshots.at(-1),
    });
    if (!interview) return result("gave-up", fallback);
    return result(interview.status, `${fallback} Exit interview: ${interview.reason}`, interview);
  };

  try {
    log("stagehand init");
    await stagehand.init();
    log("stagehand ready");
    await assertScreenshotMatchesViewport(stagehand);
    const agent = stagehand.agent({
      mode: "cua",
      model: { modelName: model.name, apiKey: model.token, baseURL: meter.url },
      systemPrompt: SHOPPER_SYSTEM_PROMPT,
      tools: {
        finish: {
          description: "Call exactly once when the task is complete or you are blocked.",
          inputSchema: finishInput,
          execute: async (input: z.infer<typeof finishInput>) => {
            recorded.finish ??= finishInput.parse(input);
            return "Recorded. Stop now.";
          },
        },
      },
    });

    log("execute");
    const execution = agent.execute({
      instruction: goal,
      maxSteps,
      page,
      callbacks: {
        onEvidence: (event: AgentEvidenceEvent) => {
          log(
            `evidence ${event.type}${event.type === "step_finished" ? ` ${event.actionName}` : ""}`,
          );
          if (event.type === "step_finished") {
            steps.push({
              ...(screenshots.length > 0 ? { screenshotIndex: screenshots.length - 1 } : {}),
              action: event.actionName,
              args: event.actionArgs,
              reasoning: event.reasoning,
              ok: event.toolOutput.ok,
              ...(event.toolOutput.error ? { error: event.toolOutput.error } : {}),
            });
          } else if (event.type === "screenshot" && event.evidenceRole === "agent") {
            screenshots.push(event.screenshot);
          }
        },
      },
    });
    execution.catch(() => undefined);
    const outcome = await Promise.race([execution, budgetExpired]);

    const finished = recorded.finish;
    if (finished) return result(finished.status, finished.reason);
    return await unfinished(
      `it used all ${maxSteps} steps`,
      `Out of steps. Agent said: ${outcome.message}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("time budget"))
      return await unfinished(`the ${message}`, `Agent stopped: ${message}`);
    return result("gave-up", `Agent stopped: ${message}`);
  } finally {
    clearTimeout(budgetTimer);
    page.off("framenavigated", onNavigated);
    await stagehand.close().catch(() => undefined);
    await meter.close();
  }
}
