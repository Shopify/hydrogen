import { AGENT_REQUEST_HEADER_ALLOWLIST } from "../headers";
import { AGENT_RE } from "../url";
import { createProxyInterceptor } from "./proxy";

export const handleAgentProxy = createProxyInterceptor({
  match: AGENT_RE,
  allowlist: AGENT_REQUEST_HEADER_ALLOWLIST,
  formatError: (message) => ({ error: message }),
  logPrefix: "Agent proxy",
});
