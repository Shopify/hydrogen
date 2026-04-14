/**
 * Inlined from @shopify/hydrogen-react/analytics-utils.
 * Parses Shopify Global IDs (GIDs) into their component parts.
 */

export type ShopifyGid = Pick<URL, 'search' | 'searchParams' | 'hash'> & {
  id: string;
  resource: string | null;
  resourceId: string | null;
};

export function parseGid(gid: string | undefined): ShopifyGid {
  const defaultReturn: ShopifyGid = {
    id: '',
    resource: null,
    resourceId: null,
    search: '',
    searchParams: new URLSearchParams(),
    hash: '',
  };

  if (typeof gid !== 'string') return defaultReturn;

  try {
    const {search, searchParams, pathname, hash} = new URL(gid);
    const pathnameParts = pathname.split('/');
    const lastPathnamePart = pathnameParts[pathnameParts.length - 1];
    const resourcePart = pathnameParts[pathnameParts.length - 2];

    if (!lastPathnamePart || !resourcePart) return defaultReturn;

    const id = `${lastPathnamePart}${search}${hash}` || '';
    const resourceId = lastPathnamePart || null;
    const resource = resourcePart ?? null;

    return {id, resource, resourceId, search, searchParams, hash};
  } catch {
    return defaultReturn;
  }
}