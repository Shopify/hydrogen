// Test helper: a `fetch` stand-in for Hydrogen's Storefront client. Production code does not use it.
import { z } from "zod";

export type FakeRequest = {
  url: string;
  query: string;
  variables: Record<string, unknown>;
  headers: Headers;
  /** The signal of the request, as the client passed it. */
  signal: AbortSignal | undefined;
};

/**
 * One answer: a JSON body with an optional status, or `pending`: no answer until the request
 * signal aborts, then a rejection with its reason, as `fetch` does.
 */
export type FakeResponse = { status?: number; body: unknown } | { pending: true };

const requestBodySchema = z.object({
  query: z.string(),
  variables: z.record(z.string(), z.unknown()),
});

/** Answers each request with the next response, as JSON. */
export function fakeFetch(responses: FakeResponse[]): {
  fetch: typeof globalThis.fetch;
  requests: FakeRequest[];
} {
  const requests: FakeRequest[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const { query, variables } = requestBodySchema.parse(JSON.parse(String(init?.body)));
    const signal = init?.signal ?? undefined;
    requests.push({
      url: String(input),
      query,
      variables,
      headers: new Headers(init?.headers),
      signal,
    });
    const next = responses.shift();
    if (next === undefined) throw new Error("No more fake responses");
    if ("pending" in next) {
      return new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    }
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  };
  return { fetch, requests };
}
