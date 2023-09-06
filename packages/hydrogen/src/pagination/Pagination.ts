import {createElement, useEffect, useMemo, useRef, useState} from 'react';
import type {
  Maybe,
  PageInfo,
} from '@shopify/hydrogen-react/storefront-api-types';
import {flattenConnection} from '@shopify/hydrogen-react';
import {
  Link,
  LinkProps,
  useNavigation,
  useLocation,
  useNavigate,
} from '@remix-run/react';

type Connection<NodesType> =
  | {
      nodes: Array<NodesType>;
      pageInfo: PageInfo;
    }
  | {
      edges: Array<{
        node: NodesType;
      }>;
      pageInfo: PageInfo;
    };

type PaginationState<NodesType> = {
  nodes?: Array<NodesType>;
  pageInfo?: PageInfo | null;
};

interface PaginationInfo<NodesType> {
  /** The paginated array of nodes. You should map over and render this array. */
  nodes: Array<NodesType>;
  /** The `<NextLink>` is a helper component that makes it easy to navigate to the next page of paginated data. Alternatively you can build your own `<Link>` component: `<Link to={nextPageUrl} state={state} preventScrollReset />` */
  NextLink: (props: Omit<LinkProps, 'to'>) => JSX.Element | null;
  /** The `<PreviousLink>` is a helper component that makes it easy to navigate to the previous page of paginated data. Alternatively you can build your own `<Link>` component: `<Link to={previousPageUrl} state={state} preventScrollReset />` */
  PreviousLink: (props: Omit<LinkProps, 'to'>) => JSX.Element | null;
  /** The URL to the previous page of paginated data. Use this prop to build your own `<Link>` component. */
  previousPageUrl: string;
  /** The URL to the next page of paginated data. Use this prop to build your own `<Link>` component. */
  nextPageUrl: string;
  /** True if the cursor has next paginated data */
  hasNextPage: boolean;
  /** True if the cursor has previous paginated data */
  hasPreviousPage: boolean;
  /** True if we are in the process of fetching another page of data */
  isLoading: boolean;
  /** The `state` property is important to use when building your own `<Link>` component if you want paginated data to continuously append to the page. This means that every time the user clicks "Next page", the next page of data will be apppended inline with the previous page. If you want the whole page to re-render with only the next page results, do not pass the `state` prop to the Remix `<Link>` component. */
  state: {
    nodes: Array<NodesType>;
    pageInfo: {
      endCursor: Maybe<string> | undefined;
      startCursor: Maybe<string> | undefined;
      hasPreviousPage: boolean;
    };
  };
}

type PaginationProps<NodesType> = {
  /** The response from `storefront.query` for a paginated request. Make sure the query is passed pagination variables and that the query has `pageInfo` with `hasPreviousPage`, `hasNextpage`, `startCursor`, and `endCursor` defined. */
  connection: Connection<NodesType>;
  /** A render prop that includes pagination data and helpers. */
  children: PaginationRenderProp<NodesType>;
};

type PaginationRenderProp<NodesType> = (
  props: PaginationInfo<NodesType>,
) => JSX.Element | null;

/**
 *
 * The [Storefront API uses cursors](https://shopify.dev/docs/api/usage/pagination-graphql) to paginate through lists of data
 * and the \`<Pagination />\` component makes it easy to paginate data from the Storefront API.
 *
 * @prop connection The response from `storefront.query` for a paginated request. Make sure the query is passed pagination variables and that the query has `pageInfo` with `hasPreviousPage`, `hasNextpage`, `startCursor`, and `endCursor` defined.
 * @prop children A render prop that includes pagination data and helpers.
 */
export function Pagination<NodesType>({
  connection,
  children = () => {
    console.warn('<Pagination> requires children to work properly');
    return null;
  },
}: PaginationProps<NodesType>) {
  const transition = useNavigation();
  const isLoading = transition.state === 'loading';
  const {
    endCursor,
    hasNextPage,
    hasPreviousPage,
    nextPageUrl,
    nodes,
    previousPageUrl,
    startCursor,
  } = usePagination<NodesType>(connection);

  const state = useMemo(
    () => ({
      pageInfo: {
        endCursor,
        hasPreviousPage,
        startCursor,
      },
      nodes,
    }),
    [endCursor, hasPreviousPage, startCursor, nodes],
  );

  const NextLink = useMemo(
    () =>
      function NextLink(props: Omit<LinkProps, 'to'>) {
        return hasNextPage
          ? createElement(Link, {
              preventScrollReset: true,
              ...props,
              to: nextPageUrl,
              state,
              replace: true,
            })
          : null;
      },
    [hasNextPage, nextPageUrl, state],
  );

  const PreviousLink = useMemo(
    () =>
      function PrevLink(props: Omit<LinkProps, 'to'>) {
        return hasPreviousPage
          ? createElement(Link, {
              preventScrollReset: true,
              ...props,
              to: previousPageUrl,
              state,
              replace: true,
            })
          : null;
      },
    [hasPreviousPage, previousPageUrl, state],
  );

  return children({
    state,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    nextPageUrl,
    nodes,
    previousPageUrl,
    NextLink,
    PreviousLink,
  });
}

function getParamsWithoutPagination(paramsString?: string) {
  const params = new URLSearchParams(paramsString);
  params.delete('cursor');
  params.delete('direction');
  return params.toString();
}

function makeError(prop: string) {
  throw new Error(
    `The Pagination component requires ${
      '`' + prop + '`'
    } to be a part of your query. See the guide on how to setup your query to include ${
      '`' + prop + '`'
    }: https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/pagination#setup-the-paginated-query`,
  );
}

/**
 * Get cumulative pagination logic for a given connection
 */
export function usePagination<NodesType>(
  connection: Connection<NodesType>,
): Omit<
  PaginationInfo<NodesType>,
  'isLoading' | 'state' | 'NextLink' | 'PreviousLink'
> & {
  startCursor: Maybe<string> | undefined;
  endCursor: Maybe<string> | undefined;
} {
  if (!connection.pageInfo) {
    makeError('pageInfo');
  }

  if (typeof connection.pageInfo.startCursor === 'undefined') {
    makeError('pageInfo.startCursor');
  }

  if (typeof connection.pageInfo.endCursor === 'undefined') {
    makeError('pageInfo.endCursor');
  }

  if (typeof connection.pageInfo.hasNextPage === 'undefined') {
    makeError('pageInfo.hasNextPage');
  }

  if (typeof connection.pageInfo.hasPreviousPage === 'undefined') {
    makeError('pageInfo.hasPreviousPage');
  }

  const navigate = useNavigate();
  const {state, search, pathname} = useLocation() as {
    state?: PaginationState<NodesType>;
    search?: string;
    pathname?: string;
  };

  const params = new URLSearchParams(search);
  const direction = params.get('direction');
  const isPrevious = direction === 'previous';
  const [nodes, setNodes] = useState(flattenConnection(connection));
  const [currentPageInfo, setCurrentPageInfo] = useState({
    startCursor: connection.pageInfo.startCursor,
    endCursor: connection.pageInfo.endCursor,
    hasPreviousPage: connection.pageInfo.hasPreviousPage,
    hasNextPage: connection.pageInfo.hasNextPage,
  });

  // Keep track of the current URL state, to compare whenever the URL changes
  const urlRef = useRef({
    params: getParamsWithoutPagination(search),
    pathname,
  });

  // Within an effect to prevent hydration errors
  useEffect(() => {
    if (
      // If the URL changes (independent of pagination params)
      // then reset the pagination params in the URL
      getParamsWithoutPagination(search) !== urlRef.current.params ||
      pathname !== urlRef.current.pathname
    ) {
      urlRef.current = {
        pathname,
        params: getParamsWithoutPagination(search),
      };
      navigate(`${pathname}?${getParamsWithoutPagination(search)}`, {
        replace: true,
        preventScrollReset: true,
        state: {nodes: undefined, pageInfo: undefined},
      });
    } else if (state?.nodes) {
      // Take existing nodes from history.state and append or prepend new nodes from the connection
      setNodes(
        isPrevious
          ? [...flattenConnection(connection), ...state.nodes]
          : [...state.nodes, ...flattenConnection(connection)],
      );

      if (state?.pageInfo) {
        // Based on the direction we are going, only take the connection pageInfo in that direction,
        // otherwise keep the existing pageInfo from history.state
        let pageStartCursor =
          state?.pageInfo?.startCursor === undefined
            ? connection.pageInfo.startCursor
            : state.pageInfo.startCursor;

        let pageEndCursor =
          state?.pageInfo?.endCursor === undefined
            ? connection.pageInfo.endCursor
            : state.pageInfo.endCursor;

        let previousPageExists =
          state?.pageInfo?.hasPreviousPage === undefined
            ? connection.pageInfo.hasPreviousPage
            : state.pageInfo.hasPreviousPage;

        let nextPageExists =
          state?.pageInfo?.hasNextPage === undefined
            ? connection.pageInfo.hasNextPage
            : state.pageInfo.hasNextPage;

        if (isPrevious) {
          pageStartCursor = connection.pageInfo.startCursor;
          previousPageExists = connection.pageInfo.hasPreviousPage;
        } else {
          pageEndCursor = connection.pageInfo.endCursor;
          nextPageExists = connection.pageInfo.hasNextPage;
        }

        setCurrentPageInfo({
          startCursor: pageStartCursor,
          endCursor: pageEndCursor,
          hasPreviousPage: previousPageExists,
          hasNextPage: nextPageExists,
        });
      }
    } else {
      setNodes(flattenConnection(connection));
      setCurrentPageInfo({
        startCursor: connection.pageInfo.startCursor,
        endCursor: connection.pageInfo.endCursor,
        hasPreviousPage: connection.pageInfo.hasPreviousPage,
        hasNextPage: connection.pageInfo.hasNextPage,
      });
    }
  }, [state, connection, isPrevious, search, navigate, pathname]);

  const previousPageUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    params.set('direction', 'previous');
    currentPageInfo.startCursor &&
      params.set('cursor', currentPageInfo.startCursor);
    return `?${params.toString()}`;
  }, [search, currentPageInfo.startCursor]);

  const nextPageUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    params.set('direction', 'next');
    currentPageInfo.endCursor &&
      params.set('cursor', currentPageInfo.endCursor);
    return `?${params.toString()}`;
  }, [search, currentPageInfo.endCursor]);

  return {...currentPageInfo, previousPageUrl, nextPageUrl, nodes};
}

/**
 * @param request The request object passed to your Remix loader function.
 * @param options Options for how to configure the pagination variables. Includes the ability to change how many nodes are within each page.
 *
 * @returns Variables to be used with the `storefront.query` function
 */
export function getPaginationVariables(
  request: Request,
  options: {pageBy: number} = {pageBy: 20},
) {
  if (!(request instanceof Request)) {
    throw new Error(
      'getPaginationVariables must be called with the Request object passed to your loader function',
    );
  }

  const {pageBy} = options;
  const searchParams = new URLSearchParams(new URL(request.url).search);

  const cursor = searchParams.get('cursor') ?? undefined;
  const direction =
    searchParams.get('direction') === 'previous' ? 'previous' : 'next';
  const isPrevious = direction === 'previous';

  const prevPage = {
    last: pageBy,
    startCursor: cursor ?? null,
  };

  const nextPage = {
    first: pageBy,
    endCursor: cursor ?? null,
  };

  const variables = isPrevious ? prevPage : nextPage;

  return variables;
}
