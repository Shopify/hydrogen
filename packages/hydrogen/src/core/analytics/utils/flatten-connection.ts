/**
 * Normalizes Shopify's GraphQL connection format into a flat array.
 *
 * Shopify's Storefront API returns list fields (like cart `lines`) in a
 * "connection" wrapper — either `{ nodes: [...] }` or `{ edges: [{ node: ... }] }`.
 * The cart diffing logic in cart-tracker.ts needs a flat array to compare line items,
 * so this utility handles both formats.
 *
 * Why both? Hydrogen queries typically use `nodes`, but merchants writing their own
 * GraphQL queries (e.g., in Next.js) may use the `edges` pattern instead.
 */

type Connection<T> = {
  nodes?: T[];
  edges?: Array<{ node: T }>;
};

export function flattenConnection<T>(connection?: Connection<T> | null): T[] {
  if (!connection) {
    if (connection === null) {
      console.warn(
        "[h2:warn:flattenConnection] Received null connection. Expected an object with `nodes` or `edges`.",
      );
    }
    return [];
  }

  if ("nodes" in connection && connection.nodes) {
    return connection.nodes;
  }

  if ("edges" in connection && Array.isArray(connection.edges)) {
    return connection.edges.map((edge) => edge.node);
  }

  return [];
}
