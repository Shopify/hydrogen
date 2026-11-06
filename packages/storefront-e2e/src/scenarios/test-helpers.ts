// Shared fakes for unit tests. Not imported by production code.
import type { EvidenceRecord } from "../evidence.ts";
import type { ArtifactStore } from "../report/artifacts.ts";
import type { RunResult } from "../result.ts";
import { isRecord, type StorefrontContext } from "../shopify/storefront.ts";

export const US_EN: StorefrontContext = { country: "US", language: "EN" };

/** A Storefront API response body that reports its effective context, as the real API does. */
export function sfapi(
  data: unknown,
  context: StorefrontContext | null = US_EN,
): {
  data: unknown;
  extensions?: { context: StorefrontContext };
} {
  return context === null ? { data } : { data, extensions: { context: { ...context } } };
}

export type FakeRequest = {
  url: string;
  query: string;
  variables: Record<string, unknown>;
  headerNames: string[];
};

/**
 * Page markup that sets the public Shopify globals the browser locale reader uses
 * (`window.Shopify.country` and `window.Shopify.locale`). For local storefront fixtures.
 */
export function shopifyLocaleScript(country: string, locale: string): string {
  return `<script>window.Shopify = { country: ${JSON.stringify(country)}, locale: ${JSON.stringify(locale)} };</script>`;
}

/**
 * A function body is evaluated with the request when it arrives, for state that changes during
 * a run or depends on the query variables.
 */
export function fakeFetch(responses: Array<{ status?: number; body: unknown }>): {
  fetch: typeof globalThis.fetch;
  requests: FakeRequest[];
} {
  const requests: FakeRequest[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const body: unknown = JSON.parse(String(init?.body));
    const request: FakeRequest = {
      url: String(input),
      query: isRecord(body) && typeof body.query === "string" ? body.query : "",
      variables: isRecord(body) && isRecord(body.variables) ? body.variables : {},
      headerNames: [...new Headers(init?.headers).keys()],
    };
    requests.push(request);
    const next = responses.shift();
    if (next === undefined) {
      throw new Error("No more fake responses");
    }
    const responseBody: unknown =
      typeof next.body === "function" ? Reflect.apply(next.body, undefined, [request]) : next.body;
    const text = typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody);
    return new Response(text, { status: next.status ?? 200 });
  };
  return { fetch, requests };
}

export function memoryArtifacts(
  options: { failEvidence?: boolean; failResult?: boolean } = {},
): ArtifactStore & {
  evidence: EvidenceRecord[];
  results: RunResult[];
} {
  const evidence: EvidenceRecord[] = [];
  const results: RunResult[] = [];
  return {
    directory: "/tmp/fake-run",
    evidence,
    results,
    async appendEvidence(record) {
      if (options.failEvidence === true) {
        throw new Error("disk full");
      }
      evidence.push(record);
    },
    async writeResult(result) {
      if (options.failResult === true) {
        throw new Error("read-only");
      }
      results.push(result);
      return "/tmp/fake-run/result.json";
    },
  };
}
