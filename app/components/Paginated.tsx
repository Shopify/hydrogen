import React, {
  Children,
  cloneElement,
  useState,
  useMemo,
  useEffect,
} from 'react';
import {Button} from '~/components';
import type {
  ArticleConnection,
  BlogConnection,
  CollectionConnection,
  ProductConnection,
} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import {useTransition, useLocation} from '@remix-run/react';
import {useHydrated} from 'remix-utils';
import {Link} from './Link';

type PaginationStateProps = {
  isPrevious: boolean;
  pageInfo: ProductConnection['pageInfo'];
};

type ConnectionNodes =
  | ProductConnection['nodes'] //Array<Product>
  | CollectionConnection['nodes']
  | BlogConnection['nodes']
  | ArticleConnection['nodes'];

type LoadPrevNextProps = {
  nodes: ConnectionNodes;
  children: (props: any) => React.ReactNode;
} & PaginationStateProps;

export function Paginated({
  connection,
  children,
}: {
  connection:
    | ProductConnection
    | CollectionConnection
    | BlogConnection
    | ArticleConnection;
  children:
    | React.ReactElement<PaginatedNextPreviousWrapper | PaginatedGridWrapper>
    | Array<
        React.ReactElement<PaginatedNextPreviousWrapper | PaginatedGridWrapper>
      >; //| JSX.Element | JSX.Element[] // | Array<PaginatedNextPreviousWrapper | PaginatedGridWrapper>
  [key: string]: any;
}): any {
  // TODO: make ts happy
  const {nodes: initialNodes, pageInfo} = connection;
  const isHydrated = useHydrated();
  const {search, state} = useLocation() as {search: string; state: any};
  const searchParams = new URLSearchParams(search);
  const isPrevious = searchParams.get('direction') === 'previous';
  const [nodes, setNodes] = useState(initialNodes);

  const Components = useMemo(
    () =>
      Children.map(children, (child) => {
        if (!child?.type) return null;

        const name = child?.type?.displayName || child?.type?.name;

        switch (name) {
          case 'PaginatedPrevious': {
            return cloneElement(
              // @ts-ignore required props passed bellow
              <PaginatedLoadPrevious />,
              {nodes, isPrevious, pageInfo, ...child.props}
            );
          }
          case 'PaginatedNext': {
            return cloneElement(
              // @ts-ignore required props passed bellow
              <PaginatedLoadNext />,
              {nodes, isPrevious, pageInfo, ...child.props}
            );
          }
          case 'PaginatedGrid': {
            return cloneElement(
              // @ts-ignore required props passed bellow
              <PaginatedGrid />,
              {nodes, ...child.props}
            );
          }
          default:
            return null;
        }
      })?.filter(Boolean),
    [children, nodes, isPrevious, Object.values([pageInfo]).join()]
  );

  // prevent hydration mismatches
  useEffect(() => {
    if (!state) return;
    if (!isHydrated) return;
    if (isPrevious) {
      setNodes([...initialNodes, ...state.nodes]);
    } else {
      setNodes([...state.nodes, ...initialNodes]);
    }
  }, [state, isHydrated, isPrevious, initialNodes]);

  return Components ? Components : null;
}

type PaginatedNextPreviousWrapper = {
  children: ({isLoading}: {isLoading: boolean}) => JSX.Element;
  [key: string]: any;
};

type PaginatedGridWrapper = {
  children: ({nodes}: {nodes: ConnectionNodes}) => JSX.Element;
  [key: string]: any;
};

type PaginatedGridProps = {
  nodes: ConnectionNodes;
  children: ({nodes}: {nodes: ConnectionNodes}) => any;
};

Paginated.Previous = function PaginatedPrevious({
  children,
}: PaginatedNextPreviousWrapper): JSX.Element | null {
  return null;
};
Paginated.Grid = function PaginatedGrid({children}: PaginatedGridWrapper) {
  return null;
};
Paginated.Next = function PaginatedNext({
  children,
}: PaginatedNextPreviousWrapper) {
  return null;
};

// fix: SSR compilation not preserving function names
Paginated.Previous.displayName = 'PaginatedPrevious';
Paginated.Grid.displayName = 'PaginatedGrid';
Paginated.Next.displayName = 'PaginatedNext';

function PaginatedLoadPrevious({
  isPrevious,
  pageInfo,
  nodes,
  children,
}: LoadPrevNextProps) {
  const transition = useTransition();
  const isHydrated = useHydrated();
  const {startCursor, endCursor, hasPreviousPage, hasNextPage} =
    usePaginatedState({isPrevious, pageInfo});

  const prevPageUrl = `?cursor=${startCursor}&direction=previous`;

  return (
    <>
      {isHydrated && hasPreviousPage && (
        <div className="flex items-center justify-center mt-6">
          <Button
            to={prevPageUrl}
            disabled={transition.state !== 'idle'}
            variant="secondary"
            width="full"
            prefetch="intent"
            state={{
              endCursor,
              hasNextPage,
              nodes,
              startCursor,
            }}
          >
            {children({isLoading: transition.state !== 'idle'})}
          </Button>
        </div>
      )}

      {!isHydrated && pageInfo.hasPreviousPage && (
        <div className="flex items-center justify-center mt-6">
          <noscript>
            <Link
              state={{
                endCursor,
                hasNextPage,
                nodes,
                startCursor,
              }}
              to={`?cursor=${pageInfo.startCursor}&direction=previous`}
            >
              {children({isLoading: false})}
            </Link>
          </noscript>
        </div>
      )}
    </>
  );
}

function PaginatedGrid({nodes, children}: PaginatedGridProps) {
  return children({nodes});
}

function PaginatedLoadNext({
  isPrevious,
  pageInfo,
  nodes,
  children,
}: LoadPrevNextProps) {
  const transition = useTransition();
  const isHydrated = useHydrated();
  const {startCursor, endCursor, hasPreviousPage, hasNextPage} =
    usePaginatedState({isPrevious, pageInfo});

  const nextPageUrl = `?cursor=${endCursor}&direction=next`;

  return (
    <>
      {isHydrated && hasNextPage && (
        <div className="flex items-center justify-center mt-6">
          <Button
            to={nextPageUrl}
            disabled={transition.state !== 'idle'}
            variant="secondary"
            width="full"
            prefetch="intent"
            state={{
              endCursor,
              hasPreviousPage,
              nodes,
              startCursor,
            }}
          >
            {children({isLoading: transition.state !== 'idle'})}
          </Button>
        </div>
      )}

      {!isHydrated && pageInfo.hasNextPage && (
        <div className="flex items-center justify-center mt-6">
          <noscript>
            <Link
              state={{
                ...pageInfo,
                nodes,
              }}
              to={`?cursor=${pageInfo.startCursor}&direction=next`}
            >
              {children({isLoading: false})}
            </Link>
          </noscript>
        </div>
      )}
    </>
  );
}

function usePaginatedState({pageInfo, isPrevious}: PaginationStateProps) {
  const {state} = useLocation() as {search: string; state: any};
  const {hasNextPage, hasPreviousPage, startCursor, endCursor} = pageInfo;

  return useMemo(() => {
    let currentStartCursor =
      state?.startCursor === undefined ? startCursor : state.startCursor;

    let currentEndCursor =
      state?.endCursor === undefined ? endCursor : state.endCursor;

    if (state?.nodes) {
      if (isPrevious) {
        currentStartCursor = startCursor;
      } else {
        currentEndCursor = endCursor;
      }
    }

    const previousPageExists =
      state?.hasPreviousPage === undefined
        ? hasPreviousPage
        : state.hasPreviousPage;

    const nextPageExists =
      state?.hasNextPage === undefined ? hasNextPage : state.hasNextPage;

    return {
      startCursor: currentStartCursor,
      endCursor: currentEndCursor,
      hasPreviousPage: previousPageExists,
      hasNextPage: nextPageExists,
    };
  }, [isPrevious, state, hasNextPage, hasPreviousPage, startCursor, endCursor]);
}
