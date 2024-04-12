import {createElement, Fragment, lazy, Suspense, useMemo} from 'react';
import {
  type Location,
  type Params,
  useLocation,
  useMatches,
} from '@remix-run/react';
import {generateSeoTags, type SeoConfig} from './generate-seo-tags';

import type {LoaderFunction, SerializeFrom} from '@remix-run/server-runtime';

const SeoLogger = lazy(() => import('./log-seo-tags'));

export interface SeoHandleFunction<
  Loader extends LoaderFunction | unknown = unknown,
> {
  (args: {
    data: Loader extends LoaderFunction ? SerializeFrom<Loader> : unknown;
    id: string;
    params: Params;
    pathname: Location['pathname'];
    search: Location['search'];
    hash: Location['hash'];
    key: string;
  }): Partial<SeoConfig>;
}

interface SeoProps {
  /** Enable debug mode that prints SEO properties for route in the console */
  debug?: boolean;
}

type SeoWrapper = undefined | {seo: any};

/**
 * @deprecated - use `getSeoMeta` instead
 */
export function Seo({debug}: SeoProps) {
  const matches = useMatches();
  const location = useLocation();

  console.warn(
    '[h2:warn:Seo] The `<Seo/>` component is deprecated. Use `getSeoMeta` instead.\nSee: https://shopify.dev/docs/api/hydrogen/2024-01/utilities/getseometa',
  );

  // Capture the seo and jsonLd configs from the route matches
  const seoConfig = useMemo(() => {
    return (
      matches
        .flatMap((match) => {
          const {handle, ...routeMatch} = match;
          const routeData = {...routeMatch, ...location};
          const handleSeo = (handle as SeoWrapper)?.seo;
          const loaderSeo = (routeMatch?.data as SeoWrapper)?.seo;

          if (!handleSeo && !loaderSeo) {
            return [];
          }

          // if seo is defined in the handle, invoke it with the route data
          if (handleSeo) {
            return recursivelyInvokeOrReturn(handleSeo, routeData);
          } else {
            return [loaderSeo];
          }
        })
        // merge route seo (priority) with the root seo if both are present
        // jsonLd definitions are instead concatenated because there can be
        // multiple jsonLd tags on any given root+route. e.g root renders Organization
        // schema and a product page renders Product schema
        .reduce((acc, current) => {
          // remove seo properties with falsy values
          Object.keys(current).forEach(
            (key) => !current[key] && delete current[key],
          );

          const {jsonLd} = current;

          if (!jsonLd) {
            return {...acc, ...current};
          }

          // concatenate jsonLds if present
          if (!acc?.jsonLd) {
            return {...acc, ...current, jsonLd: [jsonLd]};
          } else {
            if (Array.isArray(jsonLd)) {
              return {
                ...acc,
                ...current,
                jsonLd: [...acc.jsonLd, ...jsonLd],
              };
            } else {
              return {
                ...acc,
                ...current,
                jsonLd: [...acc.jsonLd, jsonLd],
              };
            }
          }
        }, {} as SeoConfig)
    );
  }, [matches, location]);

  // Generate seo and jsonLd tags from the route seo configs
  // and return the jsx elements as html
  const {html, loggerMarkup} = useMemo(() => {
    const headTags = generateSeoTags(seoConfig);
    const html = headTags.map((tag) => {
      if (tag.tag === 'script') {
        return createElement(tag.tag, {
          ...tag.props,
          key: tag.key,
          dangerouslySetInnerHTML: {__html: tag.children},
        });
      }

      return createElement(tag.tag, {...tag.props, key: tag.key}, tag.children);
    });

    const loggerMarkup = createElement(
      Suspense,
      {fallback: null},
      createElement(SeoLogger, {headTags}),
    );

    return {html, loggerMarkup};
  }, [seoConfig]);

  return createElement(Fragment, null, html, debug && loggerMarkup);
}

/**
 * Recursively invoke a function or return the value
 * @param value
 * @param rest
 * @returns
 */
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
