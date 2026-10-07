import { getLogger } from "../../logging";

const log = getLogger("analytics");

/** A GraphQL connection in either the nodes shape or the edges shape. */
type Connection<T> = {
  /** The connection's items as a flat list. */
  nodes?: T[];
  /** The connection's items, each wrapped in an edge object. */
  edges?: Array<{ node: T }>;
};

/**
 * Returns the items of a Storefront API connection as a flat array.
 *
 * The Storefront API wraps list fields, such as cart lines, in a connection. The function
 * accepts the `{ nodes: [...] }` shape and the `{ edges: [{ node: ... }] }` shape.
 *
 * For the nodes shape, the function returns the nodes array itself. Copy the result before you sort or change the array. The function returns an empty array for `undefined`, `null`, or a connection with neither field. A `null` input also logs a warning. Convert a `null` field to `undefined` to keep the warning out of your logs.
 *
 * @param connection The Storefront API connection field to flatten.
 * @returns The connection's items as a flat array, or an empty array when there are none.
 * @publicDocs
 */
export function flattenConnection<T>(connection?: Connection<T> | null): T[] {
  if (!connection) {
    if (connection === null) {
      log.warn("received null connection; expected an object with `nodes` or `edges`");
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
