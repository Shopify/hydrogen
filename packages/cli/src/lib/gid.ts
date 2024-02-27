import {AbortError} from '@shopify/cli-kit/node/error';

const GID_REGEXP = /gid:\/\/shopify\/\w*\/(\d+)/;
/**
 * @param gid a Global ID to parse (e.g. 'gid://shopify/HydrogenStorefront/1')
 * @returns the ID of the record (e.g. '1')
 */
export function parseGid(gid: string): string {
  const matches = GID_REGEXP.exec(gid);
  if (matches && matches[1] !== undefined) {
    return matches[1];
  }
  throw new AbortError(`Invalid Global ID: ${gid}`);
}
