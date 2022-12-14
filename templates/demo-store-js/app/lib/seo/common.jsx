import { useMatches } from "@remix-run/react";

export function getTitle({
  title,
  seoTitle,
  titleTemplate,
  bypassTitleTemplate,
  defaultTitle,
}) {
  let finalTitle = seoTitle ?? title ?? defaultTitle;

  if (finalTitle && !bypassTitleTemplate && titleTemplate) {
    finalTitle = titleTemplate.replace(/%s/g, () => finalTitle);
  }

  return finalTitle || "";
}

export function recursivelyInvokeOrReturn(value, ...rest) {
  if (value instanceof Function) {
    return recursivelyInvokeOrReturn(value(...rest), ...rest);
  }

  let result = {};

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
      result[key] = recursivelyInvokeOrReturn(val, ...rest);
    });

    return result;
  }

  return value;
}

function getSeoDefaults(data, match) {
  const { id, params, pathname } = match;

  let type = "page";

  // TODO: Add support for other types

  if (id.includes("products")) {
    type = "product";
  }

  if (id.includes("journal")) {
    type = "blog";
    if (params?.journalHandle) {
      type = "article";
    }
  }

  if (id.includes("collection")) {
    type = "collection";
  }

  if (id.includes("root")) {
    type = "root";
  }

  const defaults = {
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
    title: data?.layout?.shop?.title,
    description: data?.layout?.shop?.description,
  };

  return defaults;
}

export function useSeoConfig() {
  const matches = useMatches();
  const routesWithSeo = [];
  const routesWithoutSeo = [];

  const seo = matches
    .flatMap((match) => {
      const { handle, data } = match;

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
      return { ...acc, ...current };
    }, {});

  return { seo, matches: routesWithSeo };
}

export function useHeadTags(seo) {
  const tags = [];
  const ogTags = [];
  const twitterTags = [];
  const links = [];
  const LdJson = {
    "@context": "https://schema.org",
    "@type": "Thing",
  };

  const {
    titleTemplate,
    defaultTitle,
    bypassTitleTemplate,
    noindex,
    nofollow,
    ...rest
  } = seo;

  const title = getTitle({
    title: rest.title,
    defaultTitle,
    bypassTitleTemplate,
    titleTemplate,
  });

  Object.entries(rest).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      switch (key) {
        case "tags":
          const keywords = value.join(",");

          if (keywords.length > 0) {
            tags.push(
              <meta key="keywords" name="keywords" content={keywords} />
            );

            LdJson.keywords = keywords;
          }

          break;
        case "images":
          value.forEach((image) => {
            const { url, width, height, alt } = image;

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

              <meta key="og:image:alt" property="og:image:alt" content={alt} />
            );
          });

          break;
        case "alternates":
          value.forEach((alternate) => {
            const { url, lang, media } = alternate;

            links.push(
              <link
                key={url}
                rel="alternate"
                href={url}
                hrefLang={lang}
                media={media}
              />
            );
          });
      }
    }

    if (typeof value !== "string") {
      switch (key) {
        case "twitter":
          const { handle } = value;

          if (handle) {
            links.push(
              <link
                key={`me:${handle}`}
                rel="me"
                href={`https://twitter.com/${handle}`}
              />
            );
          }
          break;
        case "robots":
          const { noArchive, noSnippet, maxSnippet, unAvailableAfter } =
            value ?? {};

          const robotsParams = [
            noindex ? "noindex" : "index",
            nofollow ? "nofollow" : "follow",
            noArchive && "noarchive",
            noSnippet && "nosnippet",
            maxSnippet && `max-snippet:${maxSnippet}`,
            unAvailableAfter && `unavailable_after:${unAvailableAfter}`,
          ];

          const robotsContent = robotsParams.filter(Boolean).join(",");

          if (robotsContent) {
            tags.push(
              <meta key="robots" name="robots" content={robotsContent} />,
              <meta key="googlebot" name="googlebot" content={robotsContent} />
            );
          }

          break;
      }

      return;
    }

    switch (key) {
      case "title":
        tags.push(<title key={title}>{title}</title>);
        ogTags.push(
          <meta key={`og:title:${value}`} property="og:title" content={value} />
        );

        twitterTags.push(
          <meta
            key={`twitter:title:${value}`}
            name="twitter:title"
            content={value}
          />
        );

        LdJson.name = value;

        break;
      case "description":
        tags.push(
          <meta key="description" name="description" content={value} />
        );

        ogTags.push(
          <meta
            key="og:description"
            property="og:description"
            content={value}
          />
        );

        twitterTags.push(
          <meta
            key="twitter:description"
            name="twitter:description"
            content={value}
          />
        );

        break;

      case "url":
        links.push(<link key="canonical" rel="canonical" href={value} />);

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
