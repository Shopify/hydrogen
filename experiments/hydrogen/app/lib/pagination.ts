const DEFAULT_PAGE_BY = 20;
const PREVIOUS_DIRECTION = "previous";

export function getPaginationVariables(request: Request, { pageBy = DEFAULT_PAGE_BY } = {}) {
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const direction = url.searchParams.get("direction");

  if (cursor && direction === PREVIOUS_DIRECTION) {
    return { last: pageBy, startCursor: cursor };
  }

  if (cursor) {
    return { first: pageBy, endCursor: cursor };
  }

  return { first: pageBy };
}
