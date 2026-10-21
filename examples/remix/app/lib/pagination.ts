const DEFAULT_PAGE_BY = 20;

export type PageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
};

/** Reads `?cursor=...&direction=previous` into Storefront API connection arguments. */
export function getPaginationVariables(url: URL, { pageBy = DEFAULT_PAGE_BY } = {}) {
  const cursor = url.searchParams.get("cursor");
  const direction = url.searchParams.get("direction");

  if (cursor && direction === "previous") return { last: pageBy, startCursor: cursor };
  if (cursor) return { first: pageBy, endCursor: cursor };
  return { first: pageBy };
}
