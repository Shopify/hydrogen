import { useEffect, cloneElement, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { useFetcher } from "@remix-run/react";

interface MoreGridItems {
  className?: string
  cursor: string,
  pageBy: number,
  placeholderItem: React.ReactElement<{ key: number; }, string | React.JSXElementConstructor<any>>
  resource: "collection" | "products" | "blogs"
  setCursor: (value: string | null) => void,
  setHasNextPage: (value: boolean) => void,
  setItems: (value: any) => any,
  [key: string]: any;
}

/*
  A multipurpose observer-aware grid component
  to enable infinite loading
*/
export function MoreGridItems({
  className = "grid grid-cols-4 gap-4 mt-6",
  cursor,
  pageBy = 4,
  placeholderItem = <div className="h-[500px] bg-gray-100"></div>,
  resource = "products",
  setCursor,
  setHasNextPage,
  setItems,
  ...props
}: MoreGridItems) {
  const { load, type, data, state } = useFetcher();
  const fetching = useRef(false);

  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: true
  });

  // load next set of items
  const loadNextPage = useCallback(() => {
    if (!inView) return;
    if (type !== "init") return;
    if (fetching.current) return;
    fetching.current = true;

    const href = window.location.pathname + `?index&cursor=${cursor}`;
    load(href);
  }, [cursor, type, load, inView])

  // merge grid results and update state
  const onPageLoadedMergeItems = useCallback(() => {
    if (state !== "idle") return;
    if (!data) return;

    let hasNextPage: boolean = false,
        endCursor: string | null = null,
        pageItems: [] = [];

    // handle all types of paginated queries
    switch (resource) {
      case 'products': {
        const result = data?.collection?.products;
        hasNextPage = result.pageInfo?.hasNextPage || false;
        endCursor = result?.pageInfo?.endCursor || null;
        pageItems = result?.nodes || null
        break;
      }

      // TODO: collections
      // case 'collections': {}

      // TODO: blog
      // case 'blog': {}

      default:
    }

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
  }, [data, state])


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
