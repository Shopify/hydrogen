import { z } from "zod";

import type { ModelConfig } from "./agent";

export type ExitInterview = { readonly status: "blocked" | "gave-up"; readonly reason: string };

const answerSchema = z.object({ status: z.enum(["blocked", "gave-up"]), reason: z.string() });

const RECENT_NOTES = 15;

/**
 * Asks the model once, after it ran out of steps or time without finishing, whether the store
 * stopped it. The agent ignores soft "give up" instructions while it still has steps left, so
 * this turns a silent timeout into a diagnosis. A BLOCKED verdict still needs the verifier to
 * see no successful checkout, so this can never fail a store that worked.
 *
 * Anthropic Messages API only; other providers skip the interview.
 */
export async function exitInterview(options: {
  readonly model: ModelConfig;
  /** Base URL to call (the metering proxy, so the interview is costed with the run). */
  readonly baseUrl: string;
  readonly goal: string;
  readonly why: string;
  readonly thoughts: readonly string[];
  readonly lastScreenshot: Buffer | undefined;
}): Promise<ExitInterview | null> {
  const { model, baseUrl, goal, why, thoughts, lastScreenshot } = options;
  if (!model.name.startsWith("anthropic/")) return null;

  const notes = thoughts
    .slice(-RECENT_NOTES)
    .map((t, i) => `${i + 1}. ${t}`)
    .join("\n");
  const prompt = `You were shopping on an online store with this goal: ${goal}
You stopped before finishing because ${why}.
Your most recent notes:
${notes || "(none)"}
${lastScreenshot ? "The attached screenshot is the last thing you saw." : ""}

Decide whether the store itself prevented you from completing the goal.
Answer "blocked" only if the store misbehaved: errors, the cart showing a different item or
quantity than you added, or controls that did nothing. Answer "gave-up" if the store seemed to work
and you simply needed more steps or time.
Reply with JSON only: {"status": "blocked" | "gave-up", "reason": "one sentence describing what you saw"}`;

  const content: unknown[] = [{ type: "text", text: prompt }];
  if (lastScreenshot) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: lastScreenshot.toString("base64") },
    });
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": model.token,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model.name.replace(/^anthropic\//, ""),
        max_tokens: 300,
        messages: [{ role: "user", content }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const body: unknown = await response.json();
    return parseAnswer(body);
  } catch {
    return null;
  }
}

function parseAnswer(body: unknown): ExitInterview | null {
  if (
    typeof body !== "object" ||
    body === null ||
    !("content" in body) ||
    !Array.isArray(body.content)
  ) {
    return null;
  }
  const text = body.content
    .map((block: unknown) =>
      typeof block === "object" &&
      block !== null &&
      "text" in block &&
      typeof block.text === "string"
        ? block.text
        : "",
    )
    .join("");
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  try {
    const parsed = answerSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
