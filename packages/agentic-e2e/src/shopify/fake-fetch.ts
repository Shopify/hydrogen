// Test helper: a `fetch` stand-in for Hydrogen's Storefront client. Production code does not use it.
import { z } from "zod";

export type FakeRequest = {
  url: string;
  query: string;
  variables: Record<string, unknown>;
  headers: Headers;
};

const requestBodySchema = z.object({
  query: z.string(),
  variables: z.record(z.string(), z.unknown()),
});

/** Answers each request with the next response body, as JSON. */
export function fakeFetch(responses: Array<{ status?: number; body: unknown }>): {
  fetch: typeof globalThis.fetch;
  requests: FakeRequest[];
} {
  const requests: FakeRequest[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const { query, variables } = requestBodySchema.parse(JSON.parse(String(init?.body)));
    requests.push({ url: String(input), query, variables, headers: new Headers(init?.headers) });
    const next = responses.shift();
    if (next === undefined) throw new Error("No more fake responses");
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  };
  return { fetch, requests };
}
