import type { ContextValue, RequestContext } from "remix/router";

/**
 * Reads a value that an earlier middleware must have set. Middleware receives the
 * untyped request context, so this turns a missing value into a clear ordering error.
 */
export function requireContext<Key extends object>(
  context: Pick<RequestContext, "get">,
  key: Key,
  name: string,
): ContextValue<Key> {
  const value = context.get(key as never) as ContextValue<Key> | undefined;
  if (value === undefined) {
    throw new Error(`${name} is missing from the request context. Check the middleware order.`);
  }
  return value;
}
