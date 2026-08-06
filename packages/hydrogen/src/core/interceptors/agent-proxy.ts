import { AGENT_REQUEST_HEADER_ALLOWLIST, SHOPIFY_CHAT_FRAME_ORIGIN_HEADER } from "../headers";
import { AGENT_BUYER_CLAIMS_RE } from "../url";
import { createProxyInterceptor } from "./proxy";

export const handleAgentProxy = createProxyInterceptor({
  match: AGENT_BUYER_CLAIMS_RE,
  headers: {
    allow: AGENT_REQUEST_HEADER_ALLOWLIST,
    prepare(headers, { request }) {
      headers.set(SHOPIFY_CHAT_FRAME_ORIGIN_HEADER, new URL(request.url).origin);
    },
  },
  formatError: (message) => ({ error: message }),
  scope: "agent-proxy",
});
