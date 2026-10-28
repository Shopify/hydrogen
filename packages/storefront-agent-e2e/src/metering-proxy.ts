import { createServer, type IncomingMessage } from "node:http";

import type { TokenUsage } from "./agent";

export type MeteringProxy = {
  /** Base URL to give the model client instead of the real endpoint. */
  readonly url: string;
  /** Token totals across every model response so far, including from cut-off runs. */
  readonly usage: () => TokenUsage;
  /** Text the model wrote alongside its actions, in order. Stagehand does not keep it. */
  readonly thoughts: () => readonly string[];
  readonly close: () => Promise<void>;
};

const FORWARDED_REQUEST_HEADERS = [
  "content-type",
  "x-api-key",
  "authorization",
  "anthropic-version",
  "anthropic-beta",
];

// A local pass-through to the model endpoint that reads the usage block of each response.
// Stagehand v3 does not report CUA token usage for runs that are cut off, so we meter here.
export async function startMeteringProxy(targetBaseUrl: string): Promise<MeteringProxy> {
  const target = targetBaseUrl.replace(/\/$/, "");
  const totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const thoughts: string[] = [];

  const server = createServer(async (req, res) => {
    try {
      const body = await readBody(req);
      const headers: Record<string, string> = {};
      for (const name of FORWARDED_REQUEST_HEADERS) {
        const value = req.headers[name];
        if (typeof value === "string") headers[name] = value;
      }
      const upstream = await fetch(`${target}${req.url ?? ""}`, {
        method: req.method,
        headers,
        body: req.method === "GET" || req.method === "HEAD" ? undefined : new Uint8Array(body),
      });
      const text = await upstream.text();
      record(text);
      res.writeHead(upstream.status, {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      });
      res.end(text);
    } catch (error) {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(
        JSON.stringify({ type: "error", error: { type: "proxy_error", message: String(error) } }),
      );
    }
  });

  function record(text: string) {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return;
    }
    if (typeof json !== "object" || json === null) return;
    if ("usage" in json) addUsage(json.usage);
    if ("content" in json && Array.isArray(json.content)) addThoughts(json.content);
  }

  function addUsage(usage: unknown) {
    if (typeof usage !== "object" || usage === null) return;
    const fields: Record<string, unknown> = { ...usage };
    totals.input += numberOr0(fields.input_tokens);
    totals.output += numberOr0(fields.output_tokens);
    totals.cacheRead += numberOr0(fields.cache_read_input_tokens);
    totals.cacheWrite += numberOr0(fields.cache_creation_input_tokens);
  }

  function addThoughts(content: unknown[]) {
    for (const block of content) {
      const text = textOf(block);
      if (text) thoughts.push(text);
    }
  }

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string")
    throw new Error("Metering proxy has no port");
  return {
    url: `http://127.0.0.1:${address.port}`,
    // Anthropic reports uncached input separately from cache reads and writes; TokenUsage counts
    // all input, with cached reads called out so they can be priced at the cache-read rate.
    usage: () => ({
      inputTokens: totals.input + totals.cacheRead + totals.cacheWrite,
      outputTokens: totals.output,
      cachedInputTokens: totals.cacheRead,
    }),
    thoughts: () => thoughts,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function textOf(block: unknown): string {
  if (typeof block !== "object" || block === null) return "";
  if (!("type" in block) || block.type !== "text" || !("text" in block)) return "";
  return typeof block.text === "string" ? block.text.trim() : "";
}

function numberOr0(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
