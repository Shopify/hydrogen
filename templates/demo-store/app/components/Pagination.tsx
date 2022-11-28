import {cloneElement, useCallback, useEffect} from 'react';
import type {
  ProductConnection,
  CollectionConnection,
  BlogConnection,
  ArticleConnection,
  PageInfo,
  Product,
  Collection,
  Article,
  Blog,
} from '@shopify/hydrogen-react/storefront-api-types';

import {useInView} from 'react-intersection-observer';
import {useTransition, useLocation, useNavigate} from '@remix-run/react';

import {Button} from '~/components';

interface PaginationLocationState<ItemsGeneric> extends PageInfo {
  items: ItemsGeneric;
}

type Connection = {
  pageInfo: PageInfo;
  nodes: unknown[];
};

type Props<Resource extends Connection> = {
  connection: Resource;
};

export function usePagination<Resource extends Connection>({
  pageInfo,
  nodes,
}: Resource): Connection {
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const isPrevious = search.get('direction') === 'previous';
  const {nodes: itemsInState = [], pageInfo: pageInfoInState} =
    (location.state as Resource) || {nodes, pageInfo};

  const {items, startCursor, endCursor, hasPreviousPage, hasNextPage} =
    Object.assign({}, pageInfo, pageInfoInState, {
      ...(itemsInState && isPrevious
        ? {
            items: [...nodes, ...itemsInState],
            startCursor: pageInfo.startCursor,
          }
        : {items: [...itemsInState, ...nodes], endCursor: pageInfo.endCursor}),
    });

  return {
    nodes: items,
    pageInfo: {
      startCursor,
      endCursor,
      hasPreviousPage,
      hasNextPage,
    },
  };
}

export function ForwardBackPagination<Resource extends Connection>({
  connection,
  children = () => null,
}: Props<Resource> & {
  children: (
    props: PaginationLocationState<Resource['nodes']>,
  ) => React.ReactNode;
}) {
  const transition = useTransition();
  const location = useLocation();
  const {
    pageInfo: {startCursor, endCursor, hasPreviousPage, hasNextPage},
    nodes: items,
  } = usePagination(connection);
  const params = new URLSearchParams(location.search);

  return (
    <>
      {hasPreviousPage && (
        <div className="flex items-center justify-center mt-6">
          <Button
            to={`?${new URLSearchParams({
              q: params.get('q') || '',
              cursor: startCursor || '',
              direction: 'previous',
            }).toString()}`}
            disabled={transition.state !== 'idle'}
            variant="secondary"
            width="full"
            prefetch="intent"
            state={{
              endCursor,
              startCursor,
              hasNextPage,
              items,
            }}
          >
            {transition.state === 'loading'
              ? 'Loading...'
              : 'Load previous products'}
          </Button>
        </div>
      )}

      {children({startCursor, endCursor, hasPreviousPage, items, hasNextPage})}

      {hasNextPage && (
        <div className="flex items-center justify-center mt-6">
          <Button
            to={`?${new URLSearchParams({
              q: params.get('q') || '',
              cursor: endCursor || '',
              direction: 'next',
            }).toString()}`}
            disabled={transition.state !== 'idle'}
            variant="secondary"
            width="full"
            prefetch="intent"
            state={{
              endCursor,
              startCursor,
              hasPreviousPage,
              items,
            }}
          >
            {transition.state !== 'idle' ? 'Loading...' : 'Load more products'}
          </Button>
        </div>
      )}
    </>
  );
}

export function InfiniteScrollPagination<Resource extends Connection>({
  connection,
  children = () => null,
  placeholder = <div />,
}: Props<Resource> & {
  children: (
    props: PaginationLocationState<Resource['nodes']>,
  ) => React.ReactNode;
  placeholder?: React.ReactElement<
    {key: number},
    string | React.JSXElementConstructor<any>
  >;
}) {
  const location = useLocation();
  const {ref, inView} = useInView({
    threshold: 0,
  });

  const navigate = useNavigate();
  const {
    pageInfo: {startCursor, endCursor, hasPreviousPage, hasNextPage},
    nodes: items,
  } = usePagination(connection);

  const loadNextPage = useCallback(() => {
    if (!inView) return;

    const href = location.pathname + `?index&cursor=${endCursor}`;
    navigate(href, {
      state: {
        nodes: items,
        pageInfo: {startCursor, endCursor, hasPreviousPage, hasNextPage},
      },
    });
  }, [endCursor, inView]);

  useEffect(loadNextPage, [endCursor, inView]);

  return (
    <>
      {children({startCursor, endCursor, hasPreviousPage, items, hasNextPage})}
      {hasNextPage && endCursor && (
        <div ref={ref}>
          {Array.from({length: items.length}).map((_, index) =>
            cloneElement(placeholder, {key: index}),
          )}
        </div>
      )}
    </>
  );
}
