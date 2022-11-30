import {useEffect, useMemo, useState} from 'react';
import type {
  Maybe,
  PageInfo,
  ProductConnection,
} from '@shopify/hydrogen-react/storefront-api-types';

import {useInView} from 'react-intersection-observer';
import {useTransition, useLocation, useNavigate} from '@remix-run/react';

import {Button} from '~/components';

type Connection = {
  pageInfo: PageInfo;
  nodes: ProductConnection['nodes'] | any[];
};

type PaginationState = {
  pageInfo: PageInfo | null;
  nodes: ProductConnection['nodes'] | any[];
};

type Props<Resource extends Connection> = {
  connection: Resource;
  autoLoadOnScroll?: boolean;
};

export function Pagination<Resource extends Connection>({
  connection,
  children = () => null,
  autoLoadOnScroll = false,
}: Props<Resource> & {
  children: ({nodes}: {nodes: Resource['nodes']}) => React.ReactNode;
}) {
  const transition = useTransition();
  const [nodes, setNodes] = useState(connection.nodes);
  const isIdle = transition.state === 'idle';
  const {search, state} = useLocation() as {
    search: string;
    state: PaginationState;
  };
  const params = new URLSearchParams(search);
  const direction = params.get('direction');
  const isPrevious = direction === 'previous';

  const {ref, inView} = useInView({
    threshold: 0,
  });

  const {startCursor, endCursor, hasPreviousPage, hasNextPage} =
    useCumulativePagination({
      isPrevious,
      pageInfo: connection.pageInfo,
    });

  const prevPageUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    params.set('direction', 'previous');
    startCursor && params.set('cursor', startCursor);
    return `?${params.toString()}`;
  }, [search, startCursor]);

  const nextPageUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    params.set('direction', 'next');
    endCursor && params.set('cursor', endCursor);
    return `?${params.toString()}`;
  }, [search, endCursor]);

  // auto load next page if in view
  useLoadMoreWhenInView({
    autoLoadOnScroll,
    inView,
    isIdle,
    connection: {
      pageInfo: {startCursor, endCursor, hasPreviousPage, hasNextPage},
      nodes,
    },
  });

  // the only way to prevent hydration mismatches
  useEffect(() => {
    if (!state) return;
    if (isPrevious) {
      setNodes([...connection.nodes, ...state.nodes]);
    } else {
      setNodes([...state.nodes, ...connection.nodes]);
    }
  }, [state, isPrevious, connection.nodes]);

  return (
    <>
      {hasPreviousPage && (
        <div className="flex items-center justify-center mt-6">
          <Button
            to={prevPageUrl}
            disabled={!isIdle}
            variant="secondary"
            width="full"
            prefetch="intent"
            state={{
              pageInfo: {
                endCursor,
                hasNextPage,
                startCursor,
              },
              nodes,
            }}
          >
            {transition.state === 'loading'
              ? 'Loading...'
              : 'Load previous products'}
          </Button>
        </div>
      )}

      {children({nodes})}

      {hasNextPage && (
        <div ref={ref} className="flex items-center justify-center mt-6">
          <Button
            to={nextPageUrl}
            disabled={!isIdle}
            variant="secondary"
            width="full"
            prefetch="intent"
            state={{
              pageInfo: {
                endCursor,
                hasPreviousPage,
                startCursor,
              },
              nodes,
            }}
          >
            {transition.state !== 'idle' ? 'Loading...' : 'Load more products'}
          </Button>
        </div>
      )}
    </>
  );
}

/**
 * Get cumulative pagination logic for a given connection
 * @param pageInfo the current connection pageInfo
 * @param isPrevious pagination direction is previous
 * @returns cumulativePageInfo {startCursor, endCursor, hasPreviousPage, hasNextPage}
 */
function useCumulativePagination({
  pageInfo,
  isPrevious,
}: {
  pageInfo: PageInfo;
  isPrevious: boolean;
}): {
  startCursor: Maybe<string> | undefined;
  endCursor: Maybe<string> | undefined;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
} {
  const {state} = useLocation() as {search: string; state: PaginationState};
  const {hasNextPage, hasPreviousPage, startCursor, endCursor} = pageInfo;

  return useMemo(() => {
    let pageStartCursor =
      state?.pageInfo?.startCursor === undefined
        ? startCursor
        : state.pageInfo.startCursor;

    let pageEndCursor =
      state?.pageInfo?.endCursor === undefined
        ? endCursor
        : state.pageInfo.endCursor;

    if (state?.nodes) {
      if (isPrevious) {
        pageStartCursor = startCursor;
      } else {
        pageEndCursor = endCursor;
      }
    }

    const previousPageExists =
      state?.pageInfo?.hasPreviousPage === undefined
        ? hasPreviousPage
        : state.pageInfo.hasPreviousPage;

    const nextPageExists =
      state?.pageInfo?.hasNextPage === undefined
        ? hasNextPage
        : state.pageInfo.hasNextPage;

    return {
      startCursor: pageStartCursor,
      endCursor: pageEndCursor,
      hasPreviousPage: previousPageExists,
      hasNextPage: nextPageExists,
    };
  }, [isPrevious, state, hasNextPage, hasPreviousPage, startCursor, endCursor]);
}

/**
 * Auto load the next pagination page when in view and autoLoadOnScroll is true
 * @param autoLoadOnScroll enable auto loading
 * @param inView trigger element is in viewport
 * @param isIdle page transition is idle
 * @param connection Storefront API connection
 */
function useLoadMoreWhenInView<Resource extends Connection>({
  autoLoadOnScroll,
  inView,
  isIdle,
  connection,
}: Pick<Props<Resource>, 'autoLoadOnScroll' | 'connection'> & {
  autoLoadOnScroll: boolean;
  inView: boolean;
  isIdle: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    pageInfo: {startCursor, endCursor, hasPreviousPage, hasNextPage},
    nodes,
  } = connection;

  // load next when in view and autoLoadOnScroll
  useEffect(() => {
    if (!autoLoadOnScroll) return;
    if (!inView) return;
    if (!hasNextPage) return;
    if (!endCursor) return;
    if (!isIdle) return;

    const nextPageUrl =
      location.pathname + `?index&cursor=${endCursor}&direction=next`;

    navigate(nextPageUrl, {
      state: {
        pageInfo: {
          endCursor,
          hasPreviousPage,
          startCursor,
        },
        nodes,
      },
    });
  }, [
    autoLoadOnScroll,
    endCursor,
    hasNextPage,
    hasPreviousPage,
    inView,
    isIdle,
    nodes,
    location.pathname,
    navigate,
    startCursor,
  ]);
}
