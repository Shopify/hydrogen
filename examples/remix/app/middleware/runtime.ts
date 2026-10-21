import { createContextKey, type Middleware } from "remix/router";

import type { Runtime } from "../env.ts";

export const RuntimeContext = createContextKey<Runtime>();
const runtimeProperty = { property: "runtime" } as const;

/** Exposes the environment, the Storefront cache, and the buyer IP as `context.runtime`. */
export function runtime(value: Runtime): Middleware<{
  key: typeof RuntimeContext;
  value: Runtime;
  property: "runtime";
}> {
  return (context, next) => {
    context.set(RuntimeContext, value, runtimeProperty);
    return next();
  };
}
