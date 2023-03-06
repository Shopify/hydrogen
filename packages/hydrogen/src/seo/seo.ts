import React from 'react';
import {
  useMatches,
  useLocation,
  type Params,
  type Location,
} from '@remix-run/react';
import {
  generateSeoTags,
  type CustomHeadTagObject,
  type Seo as SeoType,
} from './generate-seo-tags';
import {type Thing} from 'schema-dts';

import type {
  LoaderFunction,
  SerializeFrom,
  AppData,
} from '@remix-run/server-runtime';

const SeoLogger = React.lazy(() => import('./log-seo-tags'));

export interface SeoHandleFunction<
  Loader extends LoaderFunction | unknown = unknown,
  StructuredDataSchema extends Thing = Thing,
> {
  (args: {
    data: Loader extends LoaderFunction ? SerializeFrom<Loader> : AppData;
    id: string;
    params: Params;
    pathname: Location['pathname'];
    search: Location['search'];
    hash: Location['hash'];
    key: string;
  }): Partial<SeoType<StructuredDataSchema>>;
}

interface SeoProps {
  debug?: boolean;
}

export function Seo({debug}: SeoProps) {
  const matches = useMatches();
  const location = useLocation();

  const seoConfig = matches
    .flatMap((match) => {
      const {handle, ...routeMatch} = match;
      const routeInfo = {...routeMatch, ...location};

      if (handle === undefined || handle.seo === undefined) {
        if (!routeMatch?.data?.seo) {
          return [];
        }

        return [
          {
            ...routeMatch.data.seo,
          },
        ];
      }

      return recursivelyInvokeOrReturn(handle.seo, routeInfo);
    })
    .reduce((acc, current) => {
      Object.keys(current).forEach(
        (key) => !current[key] && delete current[key],
      );

      return {...acc, ...current};
    }, {});

  const headTags = generateSeoTags(seoConfig);
  const html = headTags.map((tag) => {
    if (tag.tag === 'script') {
      return React.createElement(tag.tag, {
        ...tag.props,
        key: tag.key,
        dangerouslySetInnerHTML: {__html: tag.children},
      });
    }

    return React.createElement(
      tag.tag,
      {...tag.props, key: tag.key},
      tag.children,
    );
  });

  const loggerMarkup = React.createElement(
    React.Suspense,
    {fallback: null},
    React.createElement(SeoLogger, {headTags}),
  );

  return React.createElement(React.Fragment, null, html, debug && loggerMarkup);
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
