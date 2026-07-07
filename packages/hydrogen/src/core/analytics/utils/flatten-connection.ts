/**
 * Normalizes Shopify's GraphQL connection format into a flat array.
 *
 * Shopify's Storefront API returns list fields (like cart `lines`) in a
 * "connection" wrapper — either `{ nodes: [...] }` or `{ edges: [{ node: ... }] }`.
 * Hydrogen queries typically use `nodes`, but queries written with the `edges`
 * pattern are supported too.
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
