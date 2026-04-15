import {useEffect, useRef, type RefObject} from 'react';

type ResizeObserverSize = {
  width?: number;
  height?: number;
};

type UseResizeObserverOptions<T extends Element> = {
  ref: RefObject<T | null>;
  onResize: (size: ResizeObserverSize) => void;
};

/**
 * A hook that observes the resize of an element and calls a callback with the new size.
 * @param ref - The ref to the element to observe
 * @param onResize - The callback to call when the element is resized
 */
export function useResizeObserver<T extends Element>({
  ref,
  onResize,
}: UseResizeObserverOptions<T>) {
  const frameID = useRef(0);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;

      cancelAnimationFrame(frameID.current);

      frameID.current = requestAnimationFrame(() => {
        const {width, height} = entry.contentRect;
        onResizeRef.current?.({width, height});
      });
    });

    observer.observe(element);
    return () => {
      observer.disconnect();

      if (frameID.current) {
        cancelAnimationFrame(frameID.current);
      }
    };
  }, [ref]);
}
