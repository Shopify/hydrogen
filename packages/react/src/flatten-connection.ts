import type {PartialDeep} from 'type-fest';

/**
 * The `flattenConnection` utility transforms a connection object from the Storefront API (for example, [Product-related connections](https://shopify.dev/api/storefront/reference/products/product)) into a flat array of nodes.
 * The utility works with either `nodes` or `edges.node`.
 *
 * If `connection` is null or undefined, will return an empty array instead in production. In development, an error will be thrown.
 */
export function flattenConnection<
  ConnectionGeneric extends
    | PartialDeep<ConnectionEdges, {recurseIntoArrays: true}>
    | PartialDeep<ConnectionNodes, {recurseIntoArrays: true}>
    | ConnectionEdges
    | ConnectionNodes
>(
  connection?: ConnectionGeneric
): ConnectionGeneric extends
  | {
      edges: {node: Array<infer ConnectionBaseType>};
    }
  | {
      nodes: Array<infer ConnectionBaseType>;
    }
  ? // if it's not a PartialDeep, then return the infered type
    ConnectionBaseType[]
  : ConnectionGeneric extends
      | PartialDeep<
          {edges: {node: Array<infer ConnectionBaseType>}},
          {recurseIntoArrays: true}
        >
      | PartialDeep<
          {
            nodes: Array<infer ConnectionBaseType>;
          },
          {recurseIntoArrays: true}
        >
  ? // if it is a PartialDeep, return a PartialDeep inferred type
    PartialDeep<ConnectionBaseType[], {recurseIntoArrays: true}>
  : never {
  if (!connection) {
    const noConnectionErr = `flattenConnection(): needs a 'connection' to flatten, but received '${connection}' instead.`;
    if (__HYDROGEN_DEV__) {
      throw new Error(noConnectionErr);
    } else {
      console.error(noConnectionErr + ` Returning an empty array`);
      // @ts-expect-error We don't want to crash prod, so return an empty array
      return [];
    }
  }

  if ('nodes' in connection) {
    // @ts-expect-error return type is failing
    return connection.nodes;
  }

  if ('edges' in connection && Array.isArray(connection.edges)) {
    // @ts-expect-error return type is failing
    return connection.edges.map((edge) => {
      if (!edge?.node) {
        throw new Error(
          'flattenConnection(): Connection edges must contain nodes'
        );
      }
      return edge.node;
    });
  }

  if (__HYDROGEN_DEV__) {
    console.warn(
      `flattenConnection(): The connection did not contain either "nodes" or "edges.node". Returning an empty array.`
    );
  }

  // @ts-expect-error We don't want to crash prod, so return an empty array
  return [];
}

type ConnectionEdges = {
  edges: {node: Array<unknown>};
};

type ConnectionNodes = {
  nodes: Array<unknown>;
};

// This is only for documentation purposes, and it is not used in the code.
export interface ConnectionGenericForDoc {
  connection?: ConnectionEdges | ConnectionNodes;
}
export type FlattenConnectionReturnForDoc = Array<unknown>;
