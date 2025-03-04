import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  forwardRef,
  useState,
  type LegacyRef,
  type FC,
} from 'react';
import type {
  Maybe,
  PageInfo,
} from '@shopify/hydrogen-react/storefront-api-types';
import {flattenConnection} from '@shopify/hydrogen-react';
import {
  Link,
  type LinkProps,
  useNavigation,
  useLocation,
  useNavigate,
} from '@remix-run/react';

declare global {
  interface Window {
    // Use a global variable to keep track
    // of when the page finishes hydrating
    __hydrogenHydrated?: boolean;
  }
}

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
  pagination?: {
    [key: string]: {
      nodes: Array<NodesType>;
      pageInfo?: PageInfo | null;
    };
  };
};

interface PaginationInfo<NodesType> {
  /** The paginated array of nodes. You should map over and render this array. */
  nodes: Array<NodesType>;
  /** The `<NextLink>` is a helper component that makes it easy to navigate to the next page of paginated data. Alternatively you can build your own `<Link>` component: `<Link to={nextPageUrl} state={state} preventScrollReset />` */
  NextLink: FC<Omit<LinkProps, 'to'> & {ref?: LegacyRef<HTMLAnchorElement>}>;
  /** The `<PreviousLink>` is a helper component that makes it easy to navigate to the previous page of paginated data. Alternatively you can build your own `<Link>` component: `<Link to={previousPageUrl} state={state} preventScrollReset />` */
  PreviousLink: FC<
    Omit<LinkProps, 'to'> & {ref?: LegacyRef<HTMLAnchorElement>}
  >;
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
  /** A namespace for the pagination component to avoid URL param conflicts when using multiple `Pagination` components on a single page. */
  namespace?: string;
};

type PaginationRenderProp<NodesType> = FC<PaginationInfo<NodesType>>;

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
  namespace = '',
}: PaginationProps<NodesType>): ReturnType<FC> {
  const [isLoading, setIsLoading] = useState(false);
  const transition = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();

  // Reset loading state once the transition state is idle
  useEffect(() => {
    if (transition.state === 'idle') {
      setIsLoading(false);
    }
  }, [transition.state]);

  const {
    endCursor,
    hasNextPage,
    hasPreviousPage,
    nextPageUrl,
    nodes,
    previousPageUrl,
    startCursor,
  } = usePagination<NodesType>(connection, namespace);

  const state = useMemo(
    () => ({
      ...location.state,
      pagination: {
        ...(location.state?.pagination || {}),
        [namespace]: {
          pageInfo: {
            endCursor,
            hasPreviousPage,
            hasNextPage,
            startCursor,
          },
          nodes,
        },
      },
    }),
    [
      endCursor,
      hasNextPage,
      hasPreviousPage,
      startCursor,
      nodes,
      namespace,
      location.state,
    ],
  );

  const NextLink = useMemo(
    () =>
      forwardRef<HTMLAnchorElement, Omit<LinkProps, 'to'>>(
        function NextLink(props, ref) {
          return hasNextPage
            ? createElement(Link, {
                preventScrollReset: true,
                ...props,
                to: nextPageUrl,
                state,
                replace: true,
                ref,
                onClick: () => setIsLoading(true),
              })
            : null;
        },
      ),
    [hasNextPage, nextPageUrl, state],
  );

  const PreviousLink = useMemo(
    () =>
      forwardRef<HTMLAnchorElement, Omit<LinkProps, 'to'>>(
        function PrevLink(props, ref) {
          return hasPreviousPage
            ? createElement(Link, {
                preventScrollReset: true,
                ...props,
                to: previousPageUrl,
                state,
                replace: true,
                ref,
                onClick: () => setIsLoading(true),
              })
            : null;
        },
      ),
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

function getParamsWithoutPagination(
  paramsString?: string,
  state?: PaginationState<any>,
) {
  const params = new URLSearchParams(paramsString);

  // Get all namespaces from state
  const activeNamespaces = Object.keys(state?.pagination || {});

  activeNamespaces.forEach((namespace) => {
    // Clean up cursor and direction params for both namespaced and non-namespaced pagination
    const namespacePrefix = namespace === '' ? '' : `${namespace}_`;
    const cursorParam = `${namespacePrefix}cursor`;
    const directionParam = `${namespacePrefix}direction`;
    params.delete(cursorParam);
    params.delete(directionParam);
  });

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
  namespace: string = '',
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

  const transition = useNavigation();
  const navigate = useNavigate();
  const {state, search, pathname} = useLocation() as {
    state?: PaginationState<NodesType>;
    search?: string;
    pathname?: string;
  };

  const cursorParam = namespace ? `${namespace}_cursor` : 'cursor';
  const directionParam = namespace ? `${namespace}_direction` : 'direction';

  const params = new URLSearchParams(search);
  const direction = params.get(directionParam);
  const isPrevious = direction === 'previous';

  const nodes = useMemo(() => {
    if (
      !globalThis?.window?.__hydrogenHydrated ||
      !state?.pagination?.[namespace]?.nodes
    ) {
      return flattenConnection(connection);
    }

    if (isPrevious) {
      return [
        ...flattenConnection(connection),
        ...(state.pagination[namespace].nodes || []),
      ];
    } else {
      return [
        ...(state.pagination[namespace].nodes || []),
        ...flattenConnection(connection),
      ];
    }
  }, [state, connection, namespace]);

  const currentPageInfo = useMemo(() => {
    const hydrogenHydrated = globalThis?.window?.__hydrogenHydrated;
    const stateInfo = state?.pagination?.[namespace]?.pageInfo;

    let pageStartCursor =
      !hydrogenHydrated || stateInfo?.startCursor === undefined
        ? connection.pageInfo.startCursor
        : stateInfo.startCursor;

    let pageEndCursor =
      !hydrogenHydrated || stateInfo?.endCursor === undefined
        ? connection.pageInfo.endCursor
        : stateInfo.endCursor;

    let previousPageExists =
      !hydrogenHydrated || stateInfo?.hasPreviousPage === undefined
        ? connection.pageInfo.hasPreviousPage
        : stateInfo.hasPreviousPage;

    let nextPageExists =
      !hydrogenHydrated || stateInfo?.hasNextPage === undefined
        ? connection.pageInfo.hasNextPage
        : stateInfo.hasNextPage;

    // Update page info based on current connection
    if (state?.pagination?.[namespace]?.nodes) {
      if (isPrevious) {
        pageStartCursor = connection.pageInfo.startCursor;
        previousPageExists = connection.pageInfo.hasPreviousPage;
      } else {
        pageEndCursor = connection.pageInfo.endCursor;
        nextPageExists = connection.pageInfo.hasNextPage;
      }
    }

    return {
      startCursor: pageStartCursor,
      endCursor: pageEndCursor,
      hasPreviousPage: previousPageExists,
      hasNextPage: nextPageExists,
    };
  }, [
    isPrevious,
    state,
    namespace,
    connection.pageInfo.hasNextPage,
    connection.pageInfo.hasPreviousPage,
    connection.pageInfo.startCursor,
    connection.pageInfo.endCursor,
  ]);

  // Keep track of the current URL state, to compare whenever the URL changes
  const urlRef = useRef({
    params: getParamsWithoutPagination(search, state),
    pathname,
  });

  useEffect(() => {
    // Set a global variable to keep track of when the page finishes hydrating.
    // We can't use local state or a ref because it will be reset on soft navigations
    // to the page. This variable allows us to use the SSR'd data on the first render,
    // preventing hydration errors. On soft navigations, like browser back/forward
    // navigation, instead of using the SSR'd data, we use the data from location state.
    window.__hydrogenHydrated = true;
  }, []);

  useEffect(() => {
    const currentParams = getParamsWithoutPagination(search, state);
    const previousParams = urlRef.current.params;
    const pathChanged = pathname !== urlRef.current.pathname;
    const nonPaginationParamsChanged = currentParams !== previousParams;

    if (
      // Only clean up if the base URL or non-pagination params change
      (pathChanged || nonPaginationParamsChanged) &&
      // And we're not on the initial load
      !(transition.state === 'idle' && !transition.location)
    ) {
      urlRef.current = {
        pathname,
        params: getParamsWithoutPagination(search, state),
      };
      navigate(`${pathname}?${getParamsWithoutPagination(search, state)}`, {
        replace: true,
        preventScrollReset: true,
        state: {nodes: undefined, pageInfo: undefined},
      });
    }
  }, [pathname, search, state]);

  const previousPageUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    params.set(directionParam, 'previous');
    currentPageInfo.startCursor &&
      params.set(cursorParam, currentPageInfo.startCursor);
    return `?${params.toString()}`;
  }, [search, currentPageInfo.startCursor]);

  const nextPageUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    params.set(directionParam, 'next');
    currentPageInfo.endCursor &&
      params.set(cursorParam, currentPageInfo.endCursor);
    return `?${params.toString()}`;
  }, [search, currentPageInfo.endCursor]);

  return {...currentPageInfo, previousPageUrl, nextPageUrl, nodes};
}

/**
 * @param request The request object passed to your Remix loader function.
 * @param options Options for how to configure the pagination variables. Includes the ability to change how many nodes are within each page as well as a namespace to avoid URL param conflicts when using multiple `Pagination` components on a single page.
 *
 * @returns Variables to be used with the `storefront.query` function
 */
export function getPaginationVariables(
  request: Request,
  options: {pageBy: number; namespace?: string} = {pageBy: 20},
) {
  if (typeof request?.url === 'undefined') {
    throw new Error(
      'getPaginationVariables must be called with the Request object passed to your loader function',
    );
  }

  const {pageBy, namespace = ''} = options;
  const searchParams = new URLSearchParams(new URL(request.url).search);

  const cursorParam = namespace ? `${namespace}_cursor` : 'cursor';
  const directionParam = namespace ? `${namespace}_direction` : 'direction';

  const cursor = searchParams.get(cursorParam) ?? undefined;
  const direction =
    searchParams.get(directionParam) === 'previous' ? 'previous' : 'next';
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
