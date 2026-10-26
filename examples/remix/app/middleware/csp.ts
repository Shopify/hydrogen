import { createContextKey, type Middleware } from "remix/router";

import { createContentSecurityPolicy } from "../lib/csp.ts";
import { requireContext } from "./context.ts";
import { RuntimeContext } from "./runtime.ts";

export const NonceContext = createContextKey<string>();
const nonceProperty = { property: "nonce" } as const;

export function csp(): Middleware<{
  key: typeof NonceContext;
  value: string;
  property: "nonce";
}> {
  return async (context, next) => {
    const runtime = requireContext(context, RuntimeContext, "runtime");
    const { nonce, header } = createContentSecurityPolicy(runtime.env.PUBLIC_STORE_DOMAIN);
    context.set(NonceContext, nonce, nonceProperty);

    const response = await next();
    try {
      response.headers.set("Content-Security-Policy", header);
      return response;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const mutable = new Response(response.body, response);
      mutable.headers.set("Content-Security-Policy", header);
      return mutable;
    }
  };
}
