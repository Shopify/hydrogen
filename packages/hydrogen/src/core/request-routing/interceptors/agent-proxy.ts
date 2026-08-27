import { AGENT_REQUEST_HEADER_ALLOWLIST, SHOPIFY_CHAT_FRAME_ORIGIN_HEADER } from "../../headers";
import { AGENT_BUYER_CLAIMS_RE } from "../../url";
import { createProxyInterceptor } from "./proxy";

export const handleAgentProxy = createProxyInterceptor({
  match: AGENT_BUYER_CLAIMS_RE,
  requestHeaders: {
    allow: AGENT_REQUEST_HEADER_ALLOWLIST,
    prepare(headers, _options, url) {
      headers.set(SHOPIFY_CHAT_FRAME_ORIGIN_HEADER, url.origin);
    },
  },
  scope: "agent-proxy",
});
