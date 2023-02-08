import type {Maybe} from '@shopify/hydrogen-react/storefront-api-types';
import type {WithContext, Thing} from 'schema-dts';
import type {ComponentPropsWithoutRef} from 'react';

const ERROR_PREFIX = 'Error in SEO input: ';
// TODO: Refactor this into more reusible validators
// or use a library like zod to do this if we decide
// to use it in other places. @cartogram
const schema = {
  title: {
    validate: (value: unknown) => {
      if (typeof value === 'string' && value.length > 120) {
        throw new Error(
          ERROR_PREFIX.concat(
            '`title` should not be longer than 120 characters',
          ),
        );
      }
      return value;
    },
  },
  description: {
    validate: (value: unknown) => {
      if (typeof value === 'string' && value.length > 155) {
        throw new Error(
          ERROR_PREFIX.concat(
            '`description` should not be longer than 155 characters',
          ),
        );
      }
      return value;
    },
  },
  url: {
    validate: (value: unknown) => {
      if (typeof value === 'string' && !value.startsWith('http')) {
        throw new Error(ERROR_PREFIX.concat('`url` should be a valid URL'));
      }
      return value;
    },
  },
  handle: {
    validate: (value: unknown) => {
      if (typeof value === 'string' && !value.startsWith('@')) {
        throw new Error(ERROR_PREFIX.concat('`handle` should start with `@`'));
      }

      return value;
    },
  },
};

export interface Seo<Schema extends Thing = Thing> {
  /**
   * The <title> HTML element defines the document's title that is shown in a browser's title bar or a page's tab. It
   * only contains text; tags within the element are ignored.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title
   */
  title?: Maybe<string>;
  /**
   * Generate the title from a template that includes a `%s` placeholder for the title.
   *
   * @example
   * ```js
   * {
   *   title: 'My Page',
   *   titleTemplate: 'My Site - %s',
   * }
   * ```
   */
  titleTemplate?: Maybe<string> | null;
  /**
   * The media associated with the given page (images, videos, etc). If you pass a string, it will be used as the
   * `og:image` meta tag. If you pass an object or an array of objects, that will be used to generate
   * `og:<type of media>` meta tags. The `url` property should be the URL of the media. The `height` and `width`
   * properties are optional and should be the height and width of the media. The `altText` property is optional and
   * should be a description of the media.
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
   *       altText: 'A custom snowboard with an alpine color pallet.',
   *     }
   *   ]
   * }
   * ```
   *
   */
  media?:
    | Maybe<string>
    | Partial<SeoMedia>
    | (Partial<SeoMedia> | Maybe<string>)[];
  /**
   * The description of the page. This is used in the `name="description"` meta tag as well as the `og:description` meta
   * tag.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
   */
  description?: Maybe<string>;
  /**
   * The canonical URL of the page. This is used to tell search engines which URL is the canonical version of a page.
   * This is useful when you have multiple URLs that point to the same page. The value here will be used in the
   * `rel="canonical"` link tag as well as the `og:url` meta tag.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
   */
  url?: Maybe<string>;
  /**
   * The handle is used to generate the `twitter:site` and `twitter:creator` meta tags. Include the `@` symbol in the
   * handle.
   *
   * @example
   * ```js
   * {
   *   handle: '@shopify'
   * }
   * ```
   */
  handle?: Maybe<string>;
  /**
   * The `jsonLd` property is used to generate the `application/ld+json` script tag. This is used to provide structured
   * data to search engines. The value should be an object that conforms to the schema.org spec. The `type` property
   * should be the type of schema you are using. The `type` property is required and should be one of the following:
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
   *   jsonLd: {
   *     '@context': 'https://schema.org',
   *     '@type': 'Product',
   *     name: 'My Product',
   *     image: 'https://hydrogen.shop/image.jpg',
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
  jsonLd?: WithContext<Schema>;
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
   *       language: 'fr-CA',
   *       url: 'https://hydrogen.shop/fr-ca',
   *     },
   *   ]
   * }
   * ```
   *
   * @see https://support.google.com/webmasters/answer/189077?hl=en
   */
  alternates?: LanguageAlternate | LanguageAlternate[];
}

export interface LanguageAlternate {
  // Language code for the alternate page. This is used to generate the hreflang meta tag property.
  language: string;
  // Whether or not the alternate page is the default page. This will add the `x-default` attribution to the language
  // code.
  default?: boolean;
  // The url of the alternate page. This is used to generate the hreflang meta tag property.
  url: string;
}

export type SeoMedia = {
  // Used to generate og:<type of media> meta tag
  type: 'image' | 'video' | 'audio';
  // The url value populates both url and secure_url and is used to infer the og:<type of media>:type meta tag.
  url: Maybe<string> | undefined;
  // The height in pixels of the media. This is used to generate the og:<type of media>:height meta tag.
  height: Maybe<number> | undefined;
  // The width in pixels of the media. This is used to generate the og:<type of media>:width meta tag/
  width: Maybe<number> | undefined;
  // The alt text for the media. This is used to generate the og:<type of media>:alt meta tag.
  altText: Maybe<string> | undefined;
};

export type TagKey = 'title' | 'base' | 'meta' | 'link' | 'script';

export interface CustomHeadTagObject {
  tag: TagKey;
  props: Record<string, unknown>;
  children?: string;
  key: string;
}

/**
 * The `generateSeoTags` function generates the SEO title, meta, link and script (JSON Linking Data) tags for a page. It
 * pairs well with the SEO component in `@shopify/hydrogen` when building a Hydrogen Remix app, but can be used on its
 * own if you want to generate the tags yourself.
 */
export function generateSeoTags<
  Schema extends Thing,
  T extends Seo<Schema> = Seo<Schema>,
>(seoInput: T): CustomHeadTagObject[] {
  const output: CustomHeadTagObject[] = [];

  // TODO: Type this with `Schema` when we can use `Schema` as a generic type argument.
  let jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Thing',
  };

  for (const seoKey of Object.keys(seoInput)) {
    const values = ensureArray(seoInput[seoKey as keyof T]);
    let content;

    if (!values) {
      return [];
    }

    const tags = values.map((value) => {
      const tagResults: CustomHeadTagObject[] = [];

      if (!value) {
        return tagResults;
      }

      switch (seoKey) {
        case 'title': {
          content = validate(schema.title, value) as string;

          const title = renderTitle(seoInput?.titleTemplate, content);

          tagResults.push(
            generateTag('title', {title}),
            generateTag('meta', {property: 'og:title', content: title}),
            generateTag('meta', {name: 'twitter:title', content: title}),
          );

          jsonLd.name = content;

          break;
        }

        case 'description':
          content = validate(schema.description, value) as string;

          tagResults.push(
            generateTag('meta', {
              name: 'description',
              content,
            }),
            generateTag('meta', {
              property: 'og:description',
              content,
            }),
            generateTag('meta', {
              name: 'twitter:description',
              content,
            }),
          );

          jsonLd.description = content;

          break;

        case 'url':
          content = validate(schema.url, value) as string;

          tagResults.push(
            generateTag('meta', {property: 'og:url', content}),
            generateTag('link', {rel: 'canonical', href: content}),
          );

          jsonLd.url = content;
          jsonLd['@type'] = inferSchemaType(content);

          break;

        case 'handle':
          content = validate(schema.handle, value) as string;

          tagResults.push(
            generateTag('meta', {name: 'twitter:site', content}),
            generateTag('meta', {name: 'twitter:creator', content}),
          );

          break;

        case 'jsonLd':
          jsonLd = {...jsonLd, ...value};

          break;

        case 'media': {
          const values = ensureArray(value as unknown as Seo['media']);

          for (const media of values) {
            if (typeof media === 'string') {
              tagResults.push(
                generateTag('meta', {name: 'og:image', content: media}),
              );

              jsonLd.image = media;
            }

            if (media && typeof media === 'object') {
              const type = media.type || 'image';

              // Order matters here when adding multiple media tags @see https://ogp.me/#array
              const normalizedMedia = media
                ? {
                    url: media?.url,
                    secure_url: media?.url,
                    type: inferMimeType(media.url),
                    width: media?.width,
                    height: media?.height,
                    alt: media?.altText,
                  }
                : {};

              for (const key of Object.keys(normalizedMedia)) {
                if (normalizedMedia[key as keyof typeof normalizedMedia]) {
                  content = normalizedMedia[
                    key as keyof typeof normalizedMedia
                  ] as string;

                  tagResults.push(
                    generateTag(
                      'meta',
                      {
                        property: `og:${type}:${key}`,
                        content,
                      },
                      normalizedMedia.url as string,
                    ),
                  );
                }
              }
            }
          }
          break;
        }

        case 'alternates': {
          const alternates = ensureArray(value as unknown as Seo['alternates']);

          for (const alternate of alternates) {
            if (!alternate) {
              continue;
            }

            const {language, url, default: defaultLang} = alternate;

            const hrefLang = language
              ? `${language}${defaultLang ? '-default' : ''}`
              : undefined;

            tagResults.push(
              generateTag('link', {
                rel: 'alternate',
                hrefLang,
                href: url,
              }),
            );
          }

          break;
        }
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
        children: jsonLd as unknown as string,
      }),
    )
    .flat();
}

type MetaTagProps =
  | ComponentPropsWithoutRef<'title'>
  | ComponentPropsWithoutRef<'base'>
  | ComponentPropsWithoutRef<'meta'>
  | ComponentPropsWithoutRef<'link'>
  | ComponentPropsWithoutRef<'script'>;

function generateTag(
  tagName: 'script',
  input: ComponentPropsWithoutRef<'script'>,
  group?: string,
): CustomHeadTagObject;
function generateTag(
  tagName: 'title',
  input: ComponentPropsWithoutRef<'title'>,
  group?: string,
): CustomHeadTagObject;
function generateTag(
  tagName: 'base',
  input: ComponentPropsWithoutRef<'base'>,
  group?: string,
): CustomHeadTagObject;
function generateTag(
  tagName: 'meta',
  input: ComponentPropsWithoutRef<'meta'>,
  group?: string,
): CustomHeadTagObject;
function generateTag(
  tagName: 'link',
  input: ComponentPropsWithoutRef<'link'>,
  group?: string,
): CustomHeadTagObject;
function generateTag(
  tagName: TagKey,
  input: MetaTagProps,
  group?: string,
): CustomHeadTagObject {
  const tag: CustomHeadTagObject = {tag: tagName, props: {}, key: ''};

  // title tags don't have props so move to children
  if (tagName === 'title') {
    tag.children = input.title as string;
    tag.key = generateKey(tag);

    return tag;
  }

  // also move the input children to children and delete it
  if (tagName === 'script') {
    tag.children = JSON.stringify(input.children);

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

function generateKey(tag: CustomHeadTagObject, group?: string) {
  const {tag: tagName, props} = tag;

  if (tagName === 'title') {
    // leading 0 moves title to the top when sorting
    return '0-title';
  }

  if (tagName === 'meta') {
    // leading 0 moves meta to the top when sorting exclude secure_url from the logic because the content is the same as
    // url
    const priority =
      props.content === group &&
      typeof props.property === 'string' &&
      !props.property.endsWith('secure_url') &&
      '0';
    const groupName = [group, priority];

    return [tagName, ...groupName, props.property || props.name]
      .filter((x) => x)
      .join('-');
  }

  if (tagName === 'link') {
    const key = [tagName, props.rel, props.hrefLang || props.media]
      .filter((x) => x)
      .join('-');

    // replace spaces with dashes, needed for media prop
    return key.replace(/\s+/g, '-');
  }

  return `${tagName}-${props.type}`;
}

function renderTitle<T extends CustomHeadTagObject['children']>(
  template?:
    | string
    | ((title?: string) => string | undefined)
    | undefined
    | null,
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

function inferMimeType(url: Maybe<string> | undefined) {
  const ext = url && url.split('.').pop();

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

export type SchemaType =
  | 'Product'
  | 'ItemList'
  | 'Organization'
  | 'WebSite'
  | 'WebPage'
  | 'BlogPosting'
  | 'Thing';

function inferSchemaType(url: Maybe<string> | undefined): SchemaType {
  const defaultType = 'Thing';

  if (!url) {
    return defaultType;
  }

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
      pattern: /\/collections\/([^/]+)/,
    },
    {
      type: 'WebPage',
      pattern: /\/pages\/([^/]+)/,
    },
    {
      type: 'WebSite',
      pattern: /\/blogs\/([^/]+)/,
    },
    {
      type: 'BlogPosting',
      pattern: /\/blogs\/([^/]+)\/([^/]+)/,
    },
    {
      type: 'Organization',
      pattern: '/policies',
    },
    {
      type: 'Organization',
      pattern: /\/policies\/([^/]+)/,
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

function ensureArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

function validate(
  schema: {validate: (data: unknown) => unknown},
  data: unknown,
) {
  try {
    return schema.validate(data);
  } catch (error: unknown) {
    const message = (error as Error).message;

    // TODO: Discuss consistency of logging
    // run time warnings/helpers
    console.warn(message);

    return data;
  }
}
