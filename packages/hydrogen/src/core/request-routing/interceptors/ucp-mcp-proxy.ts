import { PROXY_REQUEST_HEADER_DENYLIST } from "../../headers";
import { UCP_MCP_RE } from "../../url";
import type { HydrogenRouteInterceptor } from "../route-types";
import { createProxyInterceptor } from "./proxy";

const JSON_RPC_INTERNAL_ERROR = -32603;

/**
 * Caller-authenticated UCP pass-through. The caller owns both the
 * Authorization header and the UCP agent profile in its request body.
 */
const proxyUcpMcpRequest = createProxyInterceptor({
  match: UCP_MCP_RE,
  methods: ["POST"],
  headers: { deny: PROXY_REQUEST_HEADER_DENYLIST },
  formatError: (message) => ({
    jsonrpc: "2.0",
    error: { code: JSON_RPC_INTERNAL_ERROR, message },
    id: null,
  }),
  scope: "ucp-mcp-proxy",
});

export const handleUcpMcpProxy: HydrogenRouteInterceptor = (url, options) => {
  if (!UCP_MCP_RE.test(url.pathname)) return null;

  // TODO: Move this into a `responseHeaders` cache policy after
  // https://github.com/Shopify/hydrogen/pull/3960 lands.
  options.requestContext.markResponseAsPersonalized("ucp request");
  return proxyUcpMcpRequest(url, options);
};
