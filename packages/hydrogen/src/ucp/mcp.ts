import type { StorefrontClient } from "../client";
import { isSellerHandle } from "../core/cart/cookie";
import { DEFAULT_TIMEOUT_IN_MS, HYDROGEN_USER_AGENT } from "../core/constants";

const UCP_MCP_PATH = "/api/ucp/mcp";
const WRITE_TOOLS = new Set(["create_cart", "update_cart"]);

export type UcpMessage = {
  type: "error" | "warning" | "info";
  code?: string;
  content?: string;
  severity?: string;
  path?: string;
};

export type UcpResponse = {
  ucp?: { capabilities?: Record<string, unknown> };
  messages?: UcpMessage[];
};

export class UcpToolError extends Error {
  readonly code: string | undefined;
  readonly severity: string | undefined;

  constructor(
    tool: string,
    status: number,
    message: string,
    details: Pick<UcpMessage, "code" | "severity"> = {},
  ) {
    super(`UCP ${tool} failed with status ${status}: ${message}`);
    this.name = "UcpToolError";
    this.code = details.code;
    this.severity = details.severity;
  }
}

export type UcpToolCaller = <T extends UcpResponse>(
  tool: string,
  args: Record<string, unknown>,
  isResult: (value: unknown) => value is T,
) => Promise<T>;

export function createUcpToolCaller(
  profile: string,
  storefrontClient: Pick<StorefrontClient, "storeUrl" | "requestContext">,
  seller?: string,
): UcpToolCaller {
  const endpoint = ucpEndpoint(storefrontClient.storeUrl, seller);
  const requestSignal = storefrontClient.requestContext.signal;

  return async (tool, args, isResult) => {
    const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT_IN_MS);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "user-agent": HYDROGEN_USER_AGENT,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: tool, arguments: { ...args, meta: requestMeta(tool, profile) } },
      }),
      cache: "no-store",
      signal: requestSignal ? AbortSignal.any([requestSignal, timeout]) : timeout,
    });

    if (!response.ok) {
      await response.body?.cancel();
      throw new UcpToolError(tool, response.status, response.statusText || "HTTP error");
    }
    return readToolResult(tool, response.status, await response.json(), isResult);
  };
}

function ucpEndpoint(storeUrl: string, seller: string | undefined): URL {
  if (seller === undefined) return new URL(UCP_MCP_PATH, storeUrl);
  const host = `${seller}.myshopify.com`;
  const endpoint = new URL(`https://${host}${UCP_MCP_PATH}`);
  if (!isSellerHandle(seller) || endpoint.hostname !== host)
    throw new TypeError(`Invalid seller handle: ${seller}`);
  return endpoint;
}

function requestMeta(tool: string, profile: string) {
  return {
    "ucp-agent": { profile },
    ...(WRITE_TOOLS.has(tool) && { "idempotency-key": crypto.randomUUID() }),
  };
}

function readToolResult<T extends UcpResponse>(
  tool: string,
  status: number,
  body: unknown,
  isResult: (value: unknown) => value is T,
): T {
  const fail = (message: string, details?: UcpMessage) =>
    new UcpToolError(tool, status, message, details);
  if (!isObject(body)) throw fail("Invalid JSON-RPC response");
  if (isObject(body.error)) {
    const { message, data } = body.error;
    throw fail(`${String(message)}${describeErrorData(data)}`);
  }
  const result = isObject(body.result) ? body.result : {};
  const content = result.structuredContent;
  if (result.isError === true) {
    const message = isUcpResponse(content) ? content.messages?.[0] : undefined;
    throw fail(message?.content ?? "Tool error", message);
  }
  if (!isResult(content)) throw fail("Unexpected structuredContent");
  return content;
}

function describeErrorData(data: unknown): string {
  if (typeof data === "string") return `: ${data}`;
  if (!isObject(data)) return "";
  const parts = [data.code, data.content].filter((part) => typeof part === "string");
  return parts.length > 0 ? ` (${parts.join(": ")})` : "";
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isUcpResponse(value: unknown): value is UcpResponse {
  return isObject(value) && (value.messages === undefined || Array.isArray(value.messages));
}
