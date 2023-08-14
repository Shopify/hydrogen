import type {
  ShopifyMonorailPayload,
  ShopifyMonorailEvent,
  ShopifyGid,
} from './analytics-types.js';

/**
 * Builds a Shopify Monorail event from a Shopify Monorail payload and a schema ID.
 * @param payload - The Monorail payload
 * @param schemaId - The schema ID to use
 * @returns The formatted payload
 **/
export function schemaWrapper(
  schemaId: string,
  payload: ShopifyMonorailPayload,
): ShopifyMonorailEvent {
  return {
    schema_id: schemaId,
    payload,
    metadata: {
      event_created_at_ms: Date.now(),
    },
  };
}

/**
 * Parses global id (gid) and returns the resource type and id.
 * @see https://shopify.dev/api/usage/gids
 * @param gid - A shopify GID (string)
 *
 * @example
 * ```ts
 * const {id, resource} = parseGid('gid://shopify/Order/123')
 * // => id = "123", resource = 'Order'
 *
 *  * const {id, resource} = parseGid('gid://shopify/Cart/abc123')
 * // => id = "abc123", resource = 'Cart'
 * ```
 **/
export function parseGid(gid: string | undefined): ShopifyGid {
  const defaultReturn: ShopifyGid = {
    id: '',
    resource: null,
    resourceId: null,
    search: '',
    searchParams: new URLSearchParams(),
    hash: '',
  };

  if (typeof gid !== 'string') {
    return defaultReturn;
  }

  try {
    const {search, searchParams, pathname, hash} = new URL(gid);
    const pathnameParts = pathname.split('/');
    const lastPathnamePart = pathnameParts[pathnameParts.length - 1];
    const resourcePart = pathnameParts[pathnameParts.length - 2];

    if (!lastPathnamePart || !resourcePart) {
      return defaultReturn;
    }

    const id = `${lastPathnamePart}${search}${hash}` || '';
    const resourceId = lastPathnamePart || null;
    const resource = resourcePart ?? null;

    return {id, resource, resourceId, search, searchParams, hash};
  } catch {
    return defaultReturn;
  }
}

/**
 * Filters properties from an object and returns a new object with only the properties that have a truthy value.
 * @param keyValuePairs - An object of key-value pairs
 * @param formattedData - An object which will hold the truthy values
 * @returns The formatted object
 **/
export function addDataIf(
  keyValuePairs: ShopifyMonorailPayload,
  formattedData: ShopifyMonorailPayload,
): ShopifyMonorailPayload {
  if (typeof keyValuePairs !== 'object') {
    return {};
  }
  Object.entries(keyValuePairs).forEach(([key, value]) => {
    if (value) {
      formattedData[key] = value;
    }
  });
  return formattedData;
}

/**
 * Utility that errors if a function is called on the server.
 * @param fnName - The name of the function
 * @returns A boolean
 **/
export function errorIfServer(fnName: string): boolean {
  if (typeof document === 'undefined') {
    console.error(
      `${fnName} should only be used within the useEffect callback or event handlers`,
    );
    return true;
  }
  return false;
}
