import { MCP_REQUEST_HEADER_ALLOWLIST } from "../headers";
import { MCP_RE } from "../url";
import { createProxyInterceptor } from "./proxy";

const JSON_RPC_INTERNAL_ERROR = -32603;

export const handleMcpProxy = createProxyInterceptor({
  match: MCP_RE,
  allowlist: MCP_REQUEST_HEADER_ALLOWLIST,
  formatError: (message) => ({
    jsonrpc: "2.0",
    error: { code: JSON_RPC_INTERNAL_ERROR, message },
    id: null,
  }),
  logPrefix: "MCP proxy",
});
