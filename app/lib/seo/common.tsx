import {useMatches, RouteMatch} from '@remix-run/react';
import type {
  SeoDescriptor,
  TwitterOptions,
  RobotsOptions,
  ImageOptions,
  AlternateOptions,
} from './types';

import type {WithContext} from 'schema-dts';

export function getTitle({
  title,
  seoTitle,
  titleTemplate,
  bypassTitleTemplate,
  defaultTitle,
}: {
  title?: string;
  seoTitle?: string;
  titleTemplate?: string;
  bypassTitleTemplate?: boolean;
  defaultTitle?: string;
}) {
  let finalTitle = seoTitle ?? title ?? defaultTitle;

  if (finalTitle && !bypassTitleTemplate && titleTemplate) {
    finalTitle = titleTemplate.replace(/%s/g, () => finalTitle!);
  }

  return finalTitle || '';
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

function getSeoDefaults(data: any, match: RouteMatch): SeoDescriptor {
  const {id, params, pathname} = match;

  let type: SeoDescriptor['type'] = 'page';

  // TODO: Add support for other types

  if (id.includes('products')) {
    type = 'product';
  }

  if (id.includes('journal')) {
    type = 'blog';
    if (params?.journalHandle) {
      type = 'article';
    }
  }

  if (id.includes('collection')) {
    type = 'collection';
  }

  if (id.includes('root')) {
    type = 'root';
  }

  return {
    type,
    site: data?.shop?.name,
    defaultTitle: data?.shop?.name,
    titleTemplate: `%s | ${data?.shop?.name}`,
    alternates: [],
    robots: {},
    images: [],
    nofollow: false,
    noindex: false,
    twitter: {},
    openGraph: {},
    url: pathname,
    tags: [],
    title: data[type]?.seo?.title,
    description: data?.product?.seo?.description,
  };
}

export function useSeoConfig(): {seo: SeoDescriptor; matches: RouteMatch[]} {
  const matches = useMatches();
  const routesWithSeo: RouteMatch[] = [];
  const routesWithoutSeo: RouteMatch[] = [];

  const seo = matches
    .flatMap((match) => {
      const {handle, data} = match;

      if (handle === undefined || handle.seo === undefined) {
        routesWithoutSeo.push(match);
        return [];
      }

      routesWithSeo.push(match);

      return {
        ...getSeoDefaults(data, match),
        ...recursivelyInvokeOrReturn(handle.seo, data),
      };
    })
    .reduce((acc, current) => {
      return {...acc, ...current};
    }, {});

  return {seo, matches: routesWithSeo};
}

export function useHeadTags(seo: SeoDescriptor) {
  const tags: React.ReactNode[] = [];
  const ogTags: React.ReactNode[] = [];
  const twitterTags: React.ReactNode[] = [];
  const links: React.ReactNode[] = [];
  const LdJson: WithContext<any> = {
    '@context': 'https://schema.org',
    '@type': 'Thing',
  };

  const {titleTemplate, defaultTitle, ...rest} = seo;
  const title = getTitle({title: rest.title, titleTemplate});

  Object.entries(rest).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      switch (key) {
        case 'tags':
          const keywords = value.join(',');
          tags.push(<meta name="keywords" content={keywords} />);

          LdJson.keywords = keywords;
          break;
        case 'images':
          console.log(value);
          (value as ImageOptions[]).forEach((image) => {
            const {url, width, height, alt} = image;

            ogTags.push(
              <meta key="og:image" property="og:image" content={url} />,
              <meta
                key="og:image:secure_url"
                property="og:image:secure_url"
                content={url}
              />,
              <meta
                key="og:image:width"
                property="og:image:width"
                content={width?.toString()}
              />,
              <meta
                key="og:image:height"
                property="og:image:height"
                content={height?.toString()}
              />,
              <meta key="og:image:alt" property="og:image:alt" content={alt} />,
            );
          });

          break;
        case 'alternates':
          (value as AlternateOptions[]).forEach((alternate) => {
            const {url, lang, media} = alternate;

            links.push(
              <link
                key={url}
                rel="alternate"
                href={url}
                hrefLang={lang}
                media={media}
              />,
            );
          });
      }
    }

    if (typeof value !== 'string') {
      switch (key) {
        case 'twitter':
          const {handle} = value as TwitterOptions;

          links.push(<link rel="me" href={`https://twitter.com/${handle}`} />);
          break;

        case 'robots':
          const {noArchive, noSnippet, maxSnippet, unAvailableAfter} =
            (value as RobotsOptions) ?? {};

          const robotsParams = [
            noArchive && 'noarchive',
            noSnippet && 'nosnippet',
            maxSnippet && `max-snippet:${maxSnippet}`,
            unAvailableAfter && `unavailable_after:${unAvailableAfter}`,
          ];

          const robotsContent = robotsParams.filter(Boolean).join(',');

          tags.push(
            <meta key="robots" name="robots" content={robotsContent} />,
            <meta key="googlebot" name="googlebot" content={robotsContent} />,
          );

          break;
      }

      return;
    }

    switch (key) {
      case 'title':
        tags.push(<title>{title}</title>);
        ogTags.push(<meta name="og:title" property={value} />);
        twitterTags.push(<meta name="twitter:title" property={value} />);

        LdJson.name = value;

        break;
      case 'description':
        tags.push(<meta name="description" content={value} />);
        ogTags.push(<meta name="og:description" property={value} />);
        twitterTags.push(<meta name="twitter:description" property={value} />);

        break;

      case 'url':
        links.push(<link rel="canonical" href={value} />);

        break;
      default:
    }
  });

  return {
    tags,
    ogTags,
    twitterTags,
    links,
    LdJson,
  };
}
