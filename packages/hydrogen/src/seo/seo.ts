import React from 'react';
import {useMatches} from '@remix-run/react';
import {generateSeoTags, type Seo as SeoType} from './generate-seo-tags';

import type {
  LoaderFunction,
  SerializeFrom,
  AppData,
} from '@remix-run/server-runtime';

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

  return React.createElement(React.Fragment, null, html);
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
