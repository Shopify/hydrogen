import * as React from 'react';
import {Pagination} from '@shopify/hydrogen';

/**
 * <PaginatedResourceSection > is a component that encapsulate how the previous and next behaviors throughout your application.
 */

export function PaginatedResourceSection<NodesType>({
  connection,
  children,
  resourcesClassName,
  namespace,
}: {
  connection: React.ComponentProps<typeof Pagination<NodesType>>['connection'];
  children: React.FunctionComponent<{node: NodesType; index: number}>;
  resourcesClassName?: string;
  namespace?: string;
}) {
  return (
    <Pagination connection={connection} namespace={namespace}>
      {({nodes, isLoading, PreviousLink, NextLink}) => {
        const resoucesMarkup = nodes.map((node, index) =>
          children({node, index}),
        );

        return (
          <div>
            <PreviousLink>
              {isLoading ? 'Loading...' : <span>↑ Load previous</span>}
            </PreviousLink>
            {resourcesClassName ? (
              <div className={resourcesClassName}>{resoucesMarkup}</div>
            ) : (
              resoucesMarkup
            )}
            <NextLink>
              {isLoading ? 'Loading...' : <span>Load more ↓</span>}
            </NextLink>
          </div>
        );
      }}
    </Pagination>
  );
}
