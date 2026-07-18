import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import {
  createHydrogenRequestContext,
  finalizeHydrogenResponse,
} from "~/lib/storefront-context.server";

export default createServerEntry({
  async fetch(request) {
    const context = await createHydrogenRequestContext(request);
    const response = await handler.fetch(request, { context });
    return finalizeHydrogenResponse(response, context);
  },
});
