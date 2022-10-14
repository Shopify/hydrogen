import { useEffect, cloneElement, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { useFetcher } from "@remix-run/react";

interface MoreGridItemsProps {
  className?: string;
  cursor: string;
  pageBy?: number;
  placeholderItem?: React.ReactElement<
    { key: number },
    string | React.JSXElementConstructor<any>
  >;
  setCursor: (value: string | null) => void;
  setHasNextPage: (value: boolean) => void;
  setItems: (value: any) => any;
  [key: string]: any;
}

/*
  A multipurpose observer-aware grid component
  to enable infinite loading
*/
export function MoreGridItems({
  className = "grid-flow-row grid gap-2 gap-y-6 md:gap-4 lg:gap-6 grid-cols-2 md:grid-cols-2 lg:grid-cols-4",
  cursor,
  pageBy = 4,
  placeholderItem = (
    <div className="bg-gray-400 h-[244px] sm:h-[280px] md:h-[500px] lg:h-[300px] xl:h-[348px] 2xl:h-[500px]"></div>
  ),
  setCursor,
  setHasNextPage,
  setItems,
  ...props
}: MoreGridItemsProps) {
  const { load, type, data, state } = useFetcher();
  const fetching = useRef(false);

  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
  });

  // load next set of items
  const loadNextPage = useCallback(() => {
    if (!inView) return;
    if (type !== "init") return;
    if (fetching.current) return;
    fetching.current = true;

    const href = window.location.pathname + `?index&cursor=${cursor}`;
    load(href);
  }, [cursor, type, load, inView]);

  // merge grid results and update state
  const onPageLoadedMergeItems = useCallback(() => {
    if (state !== "idle") return;
    if (!data) return;

    const result =
      data?.collection?.products || // /collection/$handle
      data?.products || // /products
      data?.collections; // /collections

    if (!result) {
      return console.warn("Paginated query data not supported", { data });
    }

    const hasNextPage = result?.pageInfo?.hasNextPage || false;
    const endCursor = result?.pageInfo?.endCursor || null;
    const pageItems = result?.nodes || null;

    if (!hasNextPage) {
      setCursor(null);
      setHasNextPage(false);
    } else {
      setCursor(endCursor);
      setHasNextPage(true);
    }

    if (pageItems?.length) {
      setItems((items: []) => [...items, ...pageItems]);
    }
  }, [data, state]);

  // when the placeholder grid comes into view, fetch new page
  useEffect(loadNextPage, [cursor, type, load, inView]);

  // when the new page results are ready update the state
  useEffect(onPageLoadedMergeItems, [data, state]);

  return (
    <div className={className} ref={ref} {...props}>
      {/* placeholder row of item that will be observed */}
      {new Array(pageBy).fill("").map((_, i) => {
        return cloneElement(placeholderItem, { key: i });
      })}
    </div>
  );
}
