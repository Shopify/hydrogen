import { createCartServerHandlers } from "@shopify/hydrogen";
import { createUcpCartTransport } from "@shopify/hydrogen/ucp";

export const cartHandlers = createCartServerHandlers({
  transport: createUcpCartTransport({
    agentProfile:
      "https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json",
  }),
});
