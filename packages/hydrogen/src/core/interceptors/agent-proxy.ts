import { AGENT_REQUEST_HEADER_ALLOWLIST, SHOPIFY_CHAT_FRAME_ORIGIN_HEADER } from "../headers";
import { AGENT_BUYER_CLAIMS_RE } from "../url";
import { createProxyInterceptor } from "./proxy";

export const handleAgentProxy = createProxyInterceptor({
  match: AGENT_BUYER_CLAIMS_RE,
  allowlist: AGENT_REQUEST_HEADER_ALLOWLIST,
  formatError: (message) => ({ error: message }),
  logPrefix: "Agent proxy",
  prepareHeaders(headers, { request }) {
    headers.set(SHOPIFY_CHAT_FRAME_ORIGIN_HEADER, new URL(request.url).origin);
  },
});
