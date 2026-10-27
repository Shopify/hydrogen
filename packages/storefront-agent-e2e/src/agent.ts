import { Stagehand, type AgentEvidenceEvent } from "@browserbasehq/stagehand";
import type { Page } from "@playwright/test";
import { z } from "zod";

import type { AgentClaim } from "./classify";

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
};

export type AgentRun = {
  readonly claim: AgentClaim;
  readonly reason: string;
  readonly steps: readonly AgentStep[];
  /** Every main-frame URL the page navigated to, in order. */
  readonly navigations: readonly string[];
  readonly screenshots: readonly Buffer[];
  readonly usage: { readonly inputTokens: number; readonly outputTokens: number } | null;
  readonly durationMs: number;
};

const SHOPPER_SYSTEM_PROMPT = `You are a shopper using an online store in a web browser.
You only see screenshots, and you only use the mouse and keyboard, like a normal customer.
Never type a web address; get around the store using what is on the page.
After each action, look at the new screenshot to confirm it worked before moving on.
When the whole task is complete, call the finish tool with status "done".
If something on the site stops you from completing the task after reasonable attempts,
call the finish tool with status "blocked" and say what stopped you.
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

export async function runAgent(options: {
  page: Page;
  cdpUrl: string;
  goal: string;
  model: ModelConfig;
  maxSteps: number;
}): Promise<AgentRun> {
  const { page, cdpUrl, goal, model, maxSteps } = options;
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

  try {
    log("stagehand init");
    await stagehand.init();
    log("stagehand ready");
    const agent = stagehand.agent({
      mode: "cua",
      model: { modelName: model.name, apiKey: model.token, baseURL: model.url },
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
    const result = await agent.execute({
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

    const finished = recorded.finish;
    return {
      claim: finished?.status ?? "gave-up",
      reason: finished?.reason ?? `No finish call. Agent said: ${result.message}`,
      steps,
      navigations,
      screenshots,
      usage: result.usage
        ? { inputTokens: result.usage.input_tokens, outputTokens: result.usage.output_tokens }
        : null,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      claim: "gave-up",
      reason: `Agent error: ${error instanceof Error ? error.message : String(error)}`,
      steps,
      navigations,
      screenshots,
      usage: null,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    page.off("framenavigated", onNavigated);
    await stagehand.close().catch(() => undefined);
  }
}
