import type {PartialDeep} from 'type-fest';

/**
 * The `flattenConnection` utility transforms a connection object from the Storefront API (for example, [Product-related connections](https://shopify.dev/api/storefront/reference/products/product)) into a flat array of nodes.
 * The utility works with either `nodes` or `edges.node`.
 *
 * If `connection` is null or undefined, will return an empty array instead in production. In development, an error will be thrown.
 */
export function flattenConnection<T>(
  connection?: PartialDeep<GraphQLConnection<T>, {recurseIntoArrays: true}>
): PartialDeep<T, {recurseIntoArrays: true}>[] {
  if (!connection) {
    const noConnectionErr = `flattenConnection(): needs a 'connection' to flatten, but received '${connection}' instead`;
    if (__HYDROGEN_DEV__) {
      throw new Error(noConnectionErr);
    } else {
      console.error(noConnectionErr);
      return [];
    }
  }

  if (connection.nodes) {
    return connection.nodes as PartialDeep<T, {recurseIntoArrays: true}>[];
  }

  if (connection.edges) {
    return connection.edges.map((edge) => {
      if (!edge?.node) {
        throw new Error('Connection edges must contain nodes');
      }
      return edge.node;
    });
  }

  if (__HYDROGEN_DEV__) {
    console.warn(
      `The connection did not contain either "nodes" or "edges.node". A empty array will be returned in its place.`
    );
  }

  return [];
}

interface GraphQLConnection<T> {
  edges?: {node: T}[];
  nodes?: T[];
}
