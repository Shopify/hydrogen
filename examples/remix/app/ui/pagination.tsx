import type { Handle, RemixNode } from "remix/component";

import type { PageInfo } from "../lib/pagination.ts";

/**
 * Cursor pagination as plain links. They work without JavaScript; with it, the Remix
 * runtime fetches the next page and updates the document in place.
 */
export function PaginatedResourceSection(
  handle: Handle<{
    pageInfo: PageInfo;
    url: URL;
    resourcesClassName?: string;
    ariaLabel?: string;
    children?: RemixNode;
  }>,
) {
  return () => {
    const { ariaLabel, children, pageInfo, resourcesClassName, url } = handle.props;

    return (
      <div>
        {pageInfo.hasPreviousPage && pageInfo.startCursor ? (
          <a href={pageHref(url, pageInfo.startCursor, "previous")}>
            <span aria-hidden="true">←</span> Previous page
          </a>
        ) : null}
        <div
          class={resourcesClassName}
          aria-label={ariaLabel}
          role={ariaLabel ? "region" : undefined}
        >
          {children}
        </div>
        {pageInfo.hasNextPage && pageInfo.endCursor ? (
          <a href={pageHref(url, pageInfo.endCursor, "next")}>
            Next page <span aria-hidden="true">→</span>
          </a>
        ) : null}
      </div>
    );
  };
}

function pageHref(url: URL, cursor: string, direction: "next" | "previous") {
  const next = new URL(url);
  next.searchParams.set("cursor", cursor);
  if (direction === "previous") next.searchParams.set("direction", "previous");
  else next.searchParams.delete("direction");
  return `${next.pathname}${next.search}`;
}
