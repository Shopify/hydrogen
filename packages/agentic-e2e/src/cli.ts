import path from "node:path";
import { parseArgs } from "node:util";

import { createBrowserSession, type BrowserSession } from "./browser/session.ts";
import { untilAborted, withInterruptSignals } from "./interrupt.ts";

const NAVIGATION_DEADLINE_MS = 30_000;

export const EXIT_CODES = { opened: 0, indeterminate: 2, usage: 64 } as const;

export const USAGE = `Usage: pnpm agentic-e2e <url>

Opens <url> in a headless browser and prints one JSON result line.

Options:
  -h, --help  Show this help.

Exit codes: 0 opened, 2 indeterminate, 64 usage error.`;

export type CliArgs =
  | { kind: "run"; url: URL }
  | { kind: "help" }
  | { kind: "error"; message: string };

export type RunResult =
  | { status: "opened"; url: string; title: string }
  | { status: "indeterminate"; reason: string };

export function parseCliArgs(argv: readonly string[]): CliArgs {
  let positionals: string[];
  try {
    const parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      strict: true,
      options: { help: { type: "boolean", short: "h" } },
    });
    if (parsed.values.help === true) return { kind: "help" };
    positionals = parsed.positionals;
  } catch (error) {
    return { kind: "error", message: errorMessage(error) };
  }
  const [input, ...extra] = positionals;
  if (input === undefined || extra.length > 0) {
    return { kind: "error", message: "Expected exactly one URL." };
  }
  return parseUrl(input);
}

function parseUrl(input: string): CliArgs {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { kind: "error", message: `Not a valid URL: ${input}` };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { kind: "error", message: `URL must use http or https, received ${url.protocol}` };
  }
  if (url.username !== "" || url.password !== "") {
    return { kind: "error", message: "URL must not contain credentials." };
  }
  return { kind: "run", url };
}

export async function main(argv: readonly string[]): Promise<number> {
  const args = parseCliArgs(argv);
  if (args.kind === "help") {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (args.kind === "error") {
    process.stderr.write(`${args.message}\n\n${USAGE}\n`);
    return EXIT_CODES.usage;
  }
  const result = await openUrl(args.url);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result.status === "opened" ? EXIT_CODES.opened : EXIT_CODES.indeterminate;
}

/** Opens the URL in an owned browser. Always closes the browser before it returns. */
async function openUrl(url: URL): Promise<RunResult> {
  return withInterruptSignals(async (interrupt) => {
    process.stderr.write(`Opening ${url.href}\n`);
    let session: BrowserSession | undefined;
    try {
      // An interrupt during startup makes this reject after the browser and profile are removed.
      session = await createBrowserSession(undefined, { signal: interrupt });
      return await navigate(session, url, interrupt);
    } catch (error) {
      const reason = errorMessage(error);
      process.stderr.write(`Indeterminate: ${reason}\n`);
      return { status: "indeterminate", reason };
    } finally {
      // A failed cleanup is reported, but it must not replace the result.
      await session?.close().catch((error: unknown) => {
        process.stderr.write(`Cleanup failed: ${errorMessage(error)}\n`);
      });
    }
  });
}

async function navigate(
  session: BrowserSession,
  url: URL,
  interrupt: AbortSignal,
): Promise<RunResult> {
  const deadline = new AbortController();
  const timer = setTimeout(
    () => deadline.abort(new Error(`Navigation did not finish in ${NAVIGATION_DEADLINE_MS} ms.`)),
    NAVIGATION_DEADLINE_MS,
  );
  const signal = AbortSignal.any([interrupt, deadline.signal]);
  try {
    const response = await untilAborted(
      session.page.goto(url.href, {
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_DEADLINE_MS,
      }),
      signal,
    );
    const status = response?.status();
    if (status !== undefined && status >= 400) {
      return { status: "indeterminate", reason: `HTTP ${status}` };
    }
    const title = await untilAborted(session.page.title(), signal);
    return { status: "opened", url: session.page.url(), title };
  } finally {
    clearTimeout(timer);
  }
}

/** The first line only: Playwright errors append a multi-line call log. */
function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split("\n", 1)[0]?.trim() ?? "";
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === import.meta.filename) {
  process.exitCode = await main(process.argv.slice(2));
}
