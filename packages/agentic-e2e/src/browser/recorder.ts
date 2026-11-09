import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { getSessionInternals, type BrowserSession } from "./session.ts";

const MAX_SUMMARY = 1_000;

/**
 * Saves the supplied PNG (or captures the session page) and emits a `screenshot` record.
 * Returns the screenshot path relative to the artifact directory, or `undefined` when the
 * screenshot failed. Screenshots can show sensitive page content.
 */
export async function captureStep(
  session: BrowserSession,
  step: number,
  summary: string,
  png?: Buffer,
): Promise<string | undefined> {
  const recorder = getSessionInternals(session);
  if (!recorder) throw new Error("captureStep needs a session from createBrowserSession");
  if (!Number.isSafeInteger(step) || step < 0)
    throw new Error("step must be a non-negative integer");

  const screenshot = `step-${String(step).padStart(3, "0")}.png`;
  let screenshotError: string | undefined;
  try {
    await mkdir(recorder.artifactDirectory, { recursive: true });
    const path = join(recorder.artifactDirectory, screenshot);
    if (png === undefined) {
      await session.page.screenshot({ path, timeout: 10_000 });
    } else {
      await writeFile(path, png);
    }
  } catch (error) {
    screenshotError = (error instanceof Error ? error.message : String(error)).slice(
      0,
      MAX_SUMMARY,
    );
  }
  recorder.emit({
    kind: "screenshot",
    timestamp: Date.now(),
    data: {
      step,
      summary: summary.slice(0, MAX_SUMMARY),
      ...(screenshotError === undefined ? { screenshot } : { screenshotError }),
    },
  });
  return screenshotError === undefined ? screenshot : undefined;
}
