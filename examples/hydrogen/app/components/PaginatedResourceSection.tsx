import type { ReactNode } from "react";

import { Pagination, type PaginationConnection } from "~/components/Pagination";

/**
 * <PaginatedResourceSection> encapsulates the previous and next pagination behaviors throughout your application.
 */
export function PaginatedResourceSection<NodesType>({
  connection,
  children,
  ariaLabel,
  resourcesClassName,
}: {
  connection: PaginationConnection<NodesType>;
  children: (args: { node: NodesType; index: number }) => ReactNode;
  ariaLabel?: string;
  resourcesClassName?: string;
}) {
  return (
    <Pagination connection={connection}>
      {({ nodes, isLoading, PreviousLink, NextLink }) => {
        const resourcesMarkup = nodes.map((node, index) => children({ node, index }));

        return (
          <div>
            <PreviousLink>
              {isLoading ? (
                "Loading..."
              ) : (
                <span>
                  <span aria-hidden="true">↑</span> Load previous
                </span>
              )}
            </PreviousLink>
            {resourcesClassName ? (
              <div
                aria-label={ariaLabel}
                className={resourcesClassName}
                role={ariaLabel ? "region" : undefined}
              >
                {resourcesMarkup}
              </div>
            ) : (
              resourcesMarkup
            )}
            <NextLink>
              {isLoading ? (
                "Loading..."
              ) : (
                <span>
                  Load more <span aria-hidden="true">↓</span>
                </span>
              )}
            </NextLink>
          </div>
        );
      }}
    </Pagination>
  );
}
