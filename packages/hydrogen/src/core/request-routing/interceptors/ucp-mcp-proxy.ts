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
  requestHeaders: { deny: PROXY_REQUEST_HEADER_DENYLIST },
  formatError: (message) => ({
    jsonrpc: "2.0",
    error: { code: JSON_RPC_INTERNAL_ERROR, message },
    id: null,
  }),
  scope: "ucp-mcp-proxy",
});

export const handleUcpMcpProxy: HydrogenRouteInterceptor = (url, options) => {
  if (!UCP_MCP_RE.test(url.pathname)) return null;

  options.requestContext.markResponseAsPersonalized("ucp request");
  // UCP MCP is a sanctioned session-establishing endpoint: let the store's
  // session cookie return on a cold agent request, staying within the response
  // state gating rather than bypassing it.
  options.requestContext.markResponseAsSessionEstablishing("ucp request");
  return proxyUcpMcpRequest(url, options);
};
