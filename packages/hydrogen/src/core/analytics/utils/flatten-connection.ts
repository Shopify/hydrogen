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
 * Returns the items of a Storefront API connection, such as cart lines, as a flat array.
 *
 * The function accepts the `nodes` shape and the `edges` shape. For the `nodes` shape, the function returns the original array. Copy the result before you sort or change it. The function returns an empty array for `undefined`, `null`, or a connection with neither field. A `null` input also logs a warning.
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
