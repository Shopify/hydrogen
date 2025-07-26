import * as React from 'react';
import {Pagination} from '@shopify/hydrogen';
import {useNavigate} from 'react-router';
import {useEffect} from 'react';
import {useInView} from 'react-intersection-observer';

/**
 * <InfiniteScrollPagination> wraps the Hydrogen Pagination component
 * to provide infinite scroll functionality
 */
export function InfiniteScrollPagination<NodesType>({
  connection,
  children,
  resourcesClassName,
}: {
  connection: React.ComponentProps<typeof Pagination<NodesType>>['connection'];
  children: (props: {node: NodesType; index: number}) => React.ReactNode;
  resourcesClassName?: string;
}) {
  const {ref, inView} = useInView();
  const navigate = useNavigate();

  return (
    <Pagination connection={connection}>
      {({nodes, isLoading, PreviousLink, NextLink, state, nextPageUrl, hasNextPage}) => {
        const resourcesMarkup = nodes.map((node, index) => children({node, index}));

        // Infinite scroll effect
        useEffect(() => {
          if (inView && hasNextPage) {
            navigate(nextPageUrl, {
              replace: true,
              preventScrollReset: true,
              state,
            });
          }
        }, [inView, navigate, state, nextPageUrl, hasNextPage]);

        return (
          <div>
            <PreviousLink>
              {isLoading ? 'Loading...' : <span>↑ Load previous</span>}
            </PreviousLink>
            {resourcesClassName ? (
              <div className={resourcesClassName}>{resourcesMarkup}</div>
            ) : (
              resourcesMarkup
            )}
            <br />
            <NextLink ref={ref}>
              <span ref={ref}>
                {isLoading ? 'Loading...' : <span>Load more ↓</span>}
              </span>
            </NextLink>
          </div>
        );
      }}
    </Pagination>
  );
}