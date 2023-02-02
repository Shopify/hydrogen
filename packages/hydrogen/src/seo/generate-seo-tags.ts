// TODO more this whole file to a storefront-react package
import type {Maybe} from '@shopify/hydrogen-react/storefront-api-types';
import type {WithContext} from 'schema-dts';

export interface BaseSeo {
  description?: any;
  media?: any;
  title?: any;
  titleTemplate?: any;
  url?: any;
  handle?: any;
  ldJson?: any;
  alternates?: any[];
}

export interface Seo {
  /**
   * The <title> HTML element defines the document's title that is shown in a
   * browser's title bar or a page's tab. It only contains text; tags within the
   * element are ignored.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title
   */
  title: Maybe<string> | undefined;
  /**
   * Generate the title from a template that includes a `%s` placeholder for the
   * title.
   *
   * @example
   * ```js
   * {
   *   title: 'My Page',
   *   titleTemplate: 'My Site - %s',
   * }
   * ```
   */
  titleTemplate: Maybe<string> | undefined | null;
  /**
   * The media associated with the given page (images, videos, etc). If you pass
   * a string, it will be used as the `og:image` meta tag. If you pass an object
   * or an array of objects, that will be used to generate `og:<type of media>`
   * meta tags. The `url` property should be the URL of the media. The `height`
   * and `width` properties are optional and should be the height and width of
   * the media. The `alt` property is optional and should be a description of
   * the media.
   *
   * @example
   * ```js
   * {
   *   media: [
   *     {
   *       url: 'https://example.com/image.jpg',
   *       type: 'image',
   *       height: '400',
   *       width: '400',
   *       alt: 'A custom snowboard with an alpine color pallet.',
   *     }
   *   ]
   * }
   * ```
   *
   */
  media: Maybe<string> | undefined | SeoMedia | SeoMedia[];
  /**
   * The description of the page. This is used in the `name="description"` meta
   * tag as well as the `og:description` meta tag.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
   */
  description: Maybe<string> | undefined;
  /**
   * The canonical URL of the page. This is used to tell search engines which
   * URL is the canonical version of a page. This is useful when you have
   * multiple URLs that point to the same page. The value here will be used in
   * the `rel="canonical"` link tag as well as the `og:url` meta tag.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
   */
  url: Maybe<string> | undefined;
  /**
   * The handle is used to generate the `twitter:site` and `twitter:creator`
   * meta tags. Include the `@` symbol in the handle.
   *
   * @example
   * ```js
   * {
   *   handle: '@shopify'
   * }
   * ```
   */
  handle: Maybe<string> | undefined;
  /**
   * The `ldJson` property is used to generate the `application/ld+json` script
   * tag. This is used to provide structured data to search engines. The value
   * should be an object that conforms to the schema.org spec. The `type`
   * property should be the type of schema you are using. The `type` property is
   * required and should be one of the following:
   *
   * - `Product`
   * - `ItemList`
   * - `Organization`
   * - `WebSite`
   * - `WebPage`
   * - `BlogPosting`
   * - `Thing`
   *
   * @example
   * ```js
   * {
   *   ldJson: {
   *     '@context': 'https://schema.org',
   *     '@type': 'Product',
   *     name: 'My Product',
   *     image: 'https://example.com/image.jpg',
   *     description: 'A product that is great',
   *     sku: '12345',
   *     mpn: '12345',
   *     brand: {
   *       '@type': 'Thing',
   *       name: 'My Brand',
   *     },
   *     aggregateRating: {
   *       '@type': 'AggregateRating',
   *       ratingValue: '4.5',
   *       reviewCount: '100',
   *     },
   *     offers: {
   *       '@type': 'Offer',
   *       priceCurrency: 'USD',
   *       price: '100',
   *       priceValidUntil: '2020-11-05',
   *       itemCondition: 'https://schema.org/NewCondition',
   *       availability: 'https://schema.org/InStock',
   *       seller: {
   *         '@type': 'Organization',
   *         name: 'My Brand',
   *       },
   *     },
   *   }
   * }
   * ```
   *
   * @see https://schema.org/docs/schemas.html
   * @see https://developers.google.com/search/docs/guides/intro-structured-data
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
   *
   */
  ldJson: <T extends SchemaType>(type: T) => WithContext<T>;
  /**
   * The `alternates` property is used to specify the language and geographical targeting when you have multiple
   * versions of the same page in different languages. The `url` property tells search engines about these variations
   * and helps them to serve the correct version to their users.
   *
   * @example
   * ```js
   * {
   *   alternates: [
   *     {
   *       language: 'en-US',
   *       url: 'https://hydrogen.shop/en-us',
   *       default: true,
   *     },
   *     {
   *       media: 'only screen and (max-width: 640px)',
   *       url: 'https://m.hydrogen.shop/en-ca',
   *     },
   *     {
   *       language: 'fr-CA',
   *       url: 'https://hydrogen.shop/fr-ca',
   *     },
   *   ]
   * }
   * ```
   * @see https://support.google.com/webmasters/answer/189077?hl=en
   */
  alternates: (LanguageAlternate | MobileAlternate)[];
}

export interface LanguageAlternate {
  // Language code for the alternate page. This is used to generate the hreflang meta tag property.
  language: string;
  // Whether or not the alternate page is the default page. This will add the `x-default`
  // attribution to the language code.
  default?: boolean;
  // The url of the alternate page. This is used to generate the hreflang meta tag property.
  url: string;
}

export interface MobileAlternate {
  // The media attribute specifies what media/device the target url is optimized for.
  media: string;
  // The url of the alternate page. This is used to generate the hreflang meta tag property.
  url: string;
}

export type SeoMedia = {
  // Used to generate og:<type of media> meta tag
  type: 'image' | 'video' | 'audio';
  // The url value populates both url and secure_url and is used to infer the
  // og:<type of media>:type meta tag.
  url: Maybe<string> | undefined;
  // The height in pixels of the media. This is used to generate the og:<type of
  // media>:height meta tag.
  height: Maybe<number> | undefined;
  // The width in pixels of the media. This is used to generate the og:<type of
  // media>:width meta tag/
  width: Maybe<number> | undefined;
  // The alt text for the media. This is used to generate the og:<type of
  // media>:alt meta tag.
  altText: Maybe<string> | undefined;
};

export type TagKey = 'title' | 'base' | 'meta' | 'link' | 'script';

export interface HeadTag {
  tag: TagKey;
  props: Record<string, any>;
  children?: string;
  key: string;
}

export type SchemaType =
  | 'Product'
  | 'ItemList'
  | 'Organization'
  | 'WebSite'
  | 'WebPage'
  | 'BlogPosting'
  | 'Thing';

export function generateSeoTags<T extends BaseSeo = Seo>(input: T) {
  const output: HeadTag[] = [];
  let ldJson: WithContext<any> = {
    '@context': 'https://schema.org',
    '@type': 'Thing',
  };

  for (const tag of Object.keys(input)) {
    const values = Array.isArray(input[tag as keyof T])
      ? (input[tag as keyof T] as [keyof T][])
      : [input[tag as keyof T]];

    const tags = values.map((value) => {
      const tagResults: any[] = [];

      if (!value) {
        return tagResults;
      }

      switch (tag) {
        case 'title':
          const title = renderTitle(input.titleTemplate, value as string);

          tagResults.push(
            generateTag('title', title),
            generateTag('meta', {property: 'og:title', content: title}),
            generateTag('meta', {name: 'twitter:title', content: title}),
          );

          ldJson.name = title;

          break;

        case 'description':
          tagResults.push(
            generateTag('meta', {name: 'description', content: value}),
            generateTag('meta', {property: 'og:description', content: value}),
            generateTag('meta', {name: 'twitter:description', content: value}),
          );

          ldJson.description = value;

          break;

        case 'url':
          tagResults.push(
            generateTag('meta', {property: 'og:url', content: value}),
            generateTag('link', {rel: 'canonical', href: value}),
          );

          ldJson.url = value;
          ldJson['@type'] = inferSchemaType(value as string);

          break;

        case 'handle':
          tagResults.push(
            generateTag('meta', {name: 'twitter:site', content: value}),
            generateTag('meta', {name: 'twitter:creator', content: value}),
          );

          break;

        case 'ldJson':
          ldJson = {...ldJson, ...value};
          break;

        case 'media':
          const values: any = Array.isArray(value) ? value : [value];

          for (const media of values) {
            if (typeof media === 'string') {
              tagResults.push(
                generateTag('meta', {name: 'og:image', content: value}),
              );

              ldJson.image = value;
            }

            if (media && typeof media === 'object') {
              const type = media.type || 'image';

              // Order matters here when adding multiple media tags
              // @see https://ogp.me/#array
              const normalizedMedia = media
                ? {
                    url: media?.url,
                    secure_url: media?.url,
                    type: inferMimeType(media?.url),
                    width: media?.width,
                    height: media?.height,
                    alt: media?.altText,
                  }
                : {};

              for (const key of Object.keys(normalizedMedia)) {
                if (normalizedMedia[key as keyof typeof normalizedMedia]) {
                  tagResults.push(
                    generateTag(
                      'meta',
                      {
                        property: `og:${type}:${key}`,
                        content:
                          normalizedMedia[key as keyof typeof normalizedMedia],
                      },
                      normalizedMedia.url,
                    ),
                  );
                }
              }
            }
          }
          break;

        case 'alternates':
          const alternates = Array.isArray(value) ? value : [value];

          for (const alternate of alternates) {
            const {
              // @ts-expect-error untyped
              language,
              // @ts-expect-error untyped
              media,
              url,
              // @ts-expect-error untyped
              default: defaultLang,
            } = alternate as Seo['alternates'][0];

            const hreflang = language
              ? `${language}${defaultLang ? '-default' : ''}`
              : undefined;

            tagResults.push(
              generateTag('link', {
                rel: 'alternate',
                hreflang,
                media,
                href: url,
              }),
            );
          }

          break;
      }

      return tagResults;
    });

    const entries = tags.flat();

    output.push(
      // @ts-expect-error untyped
      entries.filter((value) => !!value),
    );
  }

  const additionalTags = [
    generateTag('meta', {property: 'og:type', content: 'website'}),
    generateTag('meta', {
      name: 'twitter:card',
      content: 'summary_large_image',
    }),
  ];

  return [...output, ...additionalTags]
    .flat()
    .sort((a, b) => a.key.localeCompare(b.key))
    .concat(
      // move ld+json to the end
      generateTag('script', {
        type: 'application/ld+json',
        children: JSON.stringify(ldJson),
      }),
    )
    .flat();
}

function generateTag<T extends HeadTag>(
  tagName: T['tag'],
  input: any,
  group?: string,
): T | T[] {
  const tag = {tag: tagName, props: {}} as T;

  // title tags don't have props so move to children
  if (tagName === 'title') {
    tag.children = input;
    tag.key = generateKey(tag);

    return tag;
  }

  // also move the input children to children and delete it
  if (tagName === 'script') {
    tag.children = input.children;

    delete input.children;
  }

  // the rest goes on props
  tag.props = input;

  // remove empty props
  Object.keys(tag.props).forEach(
    (key) => !tag.props[key] && delete tag.props[key],
  );

  tag.key = generateKey(tag, group);

  return tag;
}

function generateKey(tag: HeadTag, group?: string) {
  const {tag: tagName, props} = tag;

  if (tagName === 'title') {
    // leading 0 moves title to the top when sorting
    return '0-title';
  }

  if (tagName === 'meta') {
    // leading 0 moves meta to the top when sorting
    // exclude secure_url from the logic because the content is the same as url
    const priority =
      props.content === group && !props.property.endsWith('secure_url') && '0';
    const groupName = [group, priority];

    return [tagName, ...groupName, props.property || props.name]
      .filter((x) => x)
      .join('-');
  }

  if (tagName === 'link') {
    const key = [tagName, props.rel, props.hreflang || props.media]
      .filter((x) => x)
      .join('-');

    // replace spaces with dashes, needed for media prop
    return key.replace(/\s+/g, '-');
  }

  return `${tagName}-${props.type}`;
}

function renderTitle<T extends HeadTag['children']>(
  template?: string | ((title?: string) => string | undefined),
  title?: T,
): string | undefined {
  if (!template) {
    return title;
  }

  if (typeof template === 'function') {
    return template(title);
  }

  return template.replace('%s', title ?? '');
}

function inferMimeType(url: string) {
  const ext = url.split('.').pop();

  if (ext === 'svg') {
    return 'image/svg+xml';
  }

  if (ext === 'png') {
    return 'image/png';
  }

  if (ext === 'jpg' || ext === 'jpeg') {
    return 'image/jpeg';
  }

  if (ext === 'gif') {
    return 'image/gif';
  }

  if (ext === 'swf') {
    return 'application/x-shockwave-flash';
  }

  if (ext === 'mp3') {
    return 'audio/mpeg';
  }

  return 'image/jpeg';
}

function inferSchemaType(url: string): SchemaType {
  const defaultType = 'Thing';
  const routes: {type: SchemaType; pattern: RegExp | string}[] = [
    {
      type: 'WebSite',
      pattern: '^/$',
    },

    {
      type: 'Product',
      pattern: '/products/.*',
    },
    {
      type: 'ItemList',
      pattern: /\/collections$/,
    },
    {
      type: 'ItemList',
      pattern: /\/collections\/([^\/]+)/,
    },
    {
      type: 'WebPage',
      pattern: /\/pages\/([^\/]+)/,
    },
    {
      type: 'WebSite',
      pattern: /\/blogs\/([^\/]+)/,
    },
    {
      type: 'BlogPosting',
      pattern: /\/blogs\/([^\/]+)\/([^\/]+)/,
    },
    {
      type: 'Organization',
      pattern: '/policies',
    },
    {
      type: 'Organization',
      pattern: /\/policies\/([^\/]+)/,
    },
  ];

  const typeMatches = routes.filter((route) => {
    const {pattern} = route;

    const regex = new RegExp(pattern);
    return regex.test(url);
  });

  return typeMatches.length > 0
    ? typeMatches[typeMatches.length - 1].type
    : defaultType;
}
