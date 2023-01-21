import {useMatches} from '@remix-run/react';
import {generateSeoTags, type Seo as SeoType} from '@shopify/hydrogen';

import type {
  LoaderFunction,
  SerializeFrom,
  AppData,
} from '@shopify/remix-oxygen';

export interface SeoHandleFunction<
  Loader extends LoaderFunction | unknown = unknown,
> {
  (
    data: Loader extends LoaderFunction ? SerializeFrom<Loader> : AppData,
  ): Partial<SeoType>;
}

export function Seo() {
  const matches = useMatches();

  const seoConfig = matches
    .flatMap((match) => {
      const {handle, data} = match;

      if (handle === undefined || handle.seo === undefined) {
        return [];
      }

      return recursivelyInvokeOrReturn(handle.seo, data);
    })
    .reduce((acc, current) => {
      return {...acc, ...current};
    }, {});

  const headTags = generateSeoTags(seoConfig);

  /* eslint-disable react/no-children-prop */
  const html = headTags.map((tag) => {
    switch (tag.tag) {
      case 'meta':
        return <meta key={tag.key} {...tag.props} children={tag.children} />;

      case 'link':
        return <link key={tag.key} {...tag.props} children={tag.children} />;

      case 'script':
        return (
          <script key={tag.key} {...tag.props}>
            {tag.children}
          </script>
        );

      case 'title':
        return <title key={tag.key}>{tag.children}</title>;
    }
  });
  /* eslint-enable react/no-children-prop */

  return <>{html}</>;
}

export function recursivelyInvokeOrReturn<T, R extends any[]>(
  value: T | ((...rest: R) => T),
  ...rest: R
): T | Record<string, T> {
  if (value instanceof Function) {
    return recursivelyInvokeOrReturn<T, R>(value(...rest), ...rest);
  }

  let result: Record<string, T> = {};

  if (Array.isArray(value)) {
    result = value.reduce((acc, item) => {
      return [...acc, recursivelyInvokeOrReturn(item)];
    }, []);

    return result;
  }

  if (value instanceof Object) {
    const entries = Object.entries(value);

    entries.forEach(([key, val]) => {
      // @ts-expect-error
      result[key] = recursivelyInvokeOrReturn<T, R>(val, ...rest);
    });

    return result;
  }

  return value;
}
