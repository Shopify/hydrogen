import { css, type CSSMixinDescriptor, type Handle, type RemixNode } from "remix/component";

import type { PageInfo } from "../lib/pagination.ts";

/** A responsive grid of product, collection, or article cards. */
export const resourceGridStyle = css({
  display: "grid",
  gridGap: "1.5rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(var(--grid-item-width), 1fr))",
  marginBottom: "2rem",
});

/**
 * Cursor pagination as plain links. They work without JavaScript; with it, the Remix
 * runtime fetches the next page and updates the document in place.
 */
export function PaginatedResourceSection(
  handle: Handle<{
    pageInfo: PageInfo;
    url: URL;
    resourcesMix?: CSSMixinDescriptor;
    ariaLabel?: string;
    children?: RemixNode;
  }>,
) {
  return () => {
    const { ariaLabel, children, pageInfo, resourcesMix, url } = handle.props;

    return (
      <div>
        {pageInfo.hasPreviousPage && pageInfo.startCursor ? (
          <a href={pageHref(url, pageInfo.startCursor, "previous")}>
            <span aria-hidden="true">←</span> Previous page
          </a>
        ) : null}
        <div mix={resourcesMix} aria-label={ariaLabel} role={ariaLabel ? "region" : undefined}>
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
