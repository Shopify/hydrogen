import { useEffect, useMemo, useState } from "react";

import { useInView } from "react-intersection-observer";
import { useTransition, useLocation, useNavigate } from "@remix-run/react";

export function Pagination({
  connection,
  children = () => null,
  autoLoadOnScroll = true,
}) {
  const transition = useTransition();
  const isLoading = transition.state === "loading";
  const autoScrollEnabled = Boolean(autoLoadOnScroll);
  const autoScrollConfig = autoScrollEnabled
    ? autoLoadOnScroll
    : {
        threshold: 0,
        rootMargin: "1000px 0px 0px 0px",
      };

  const { ref: nextLinkRef, inView } = useInView(autoScrollConfig);
  const {
    endCursor,
    hasNextPage,
    hasPreviousPage,
    nextPageUrl,
    nodes,
    prevPageUrl,
    startCursor,
  } = usePagination(connection);

  // auto load next page if in view
  useLoadMoreWhenInView({
    disabled: !autoScrollEnabled,
    connection: {
      pageInfo: { startCursor, endCursor, hasPreviousPage, hasNextPage },
      nodes,
    },

    inView,
    isLoading,
  });

  return children({
    endCursor,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    nextLinkRef,
    nextPageUrl,
    nodes,
    prevPageUrl,
    startCursor,
  });
}

/**
 * Get cumulative pagination logic for a given connection
 */
export function usePagination(connection) {
  const [nodes, setNodes] = useState(connection.nodes);
  const { state, search } = useLocation();

  const params = new URLSearchParams(search);
  const direction = params.get("direction");
  const isPrevious = direction === "previous";

  const { hasNextPage, hasPreviousPage, startCursor, endCursor } =
    connection.pageInfo;

  const currentPageInfo = useMemo(() => {
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

  const prevPageUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    params.set("direction", "previous");
    currentPageInfo.startCursor &&
      params.set("cursor", currentPageInfo.startCursor);
    return `?${params.toString()}`;
  }, [search, currentPageInfo.startCursor]);

  const nextPageUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    params.set("direction", "next");
    currentPageInfo.endCursor &&
      params.set("cursor", currentPageInfo.endCursor);
    return `?${params.toString()}`;
  }, [search, currentPageInfo.endCursor]);

  // the only way to prevent hydration mismatches
  useEffect(() => {
    if (!state || !state?.nodes) {
      setNodes(connection.nodes);
      return;
    }

    if (isPrevious) {
      setNodes([...connection.nodes, ...state.nodes]);
    } else {
      setNodes([...state.nodes, ...connection.nodes]);
    }
  }, [state, isPrevious, connection.nodes]);

  return { ...currentPageInfo, prevPageUrl, nextPageUrl, nodes };
}

/**
 * Auto load the next pagination page when in view and autoLoadOnScroll is true
 * @param disabled disable auto loading
 * @param inView trigger element is in viewport
 * @param isIdle page transition is idle
 * @param connection Storefront API connection
 */
function useLoadMoreWhenInView({ disabled, inView, isLoading, connection }) {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    pageInfo: { startCursor, endCursor, hasPreviousPage, hasNextPage },
    nodes,
  } = connection;

  // load next when in view and autoLoadOnScroll
  useEffect(() => {
    if (!inView) return;
    if (!hasNextPage) return;
    if (!endCursor) return;
    if (disabled) return;
    if (isLoading) return;

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
    disabled,
    endCursor,
    hasNextPage,
    hasPreviousPage,
    inView,
    isLoading,
    nodes,
    location.pathname,
    navigate,
    startCursor,
  ]);
}

/**
 * Get variables for route loader to support pagination
 * @param autoLoadOnScroll enable auto loading
 * @param inView trigger element is in viewport
 * @param isIdle page transition is idle
 * @param connection Storefront API connection
 * @returns cumulativePageInfo {startCursor, endCursor, hasPreviousPage, hasNextPage}
 */
export function getPaginationVariables(request, pageBy) {
  const searchParams = new URLSearchParams(new URL(request.url).search);

  const cursor = searchParams.get("cursor") ?? undefined;
  const direction =
    searchParams.get("direction") === "previous" ? "previous" : "next";
  const isPrevious = direction === "previous";

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
