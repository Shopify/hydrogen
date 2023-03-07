import type {ComponentPropsWithoutRef} from 'react';
import type {Maybe} from '@shopify/hydrogen-react/storefront-api-types';
import type {Thing, WithContext} from 'schema-dts';

const ERROR_PREFIX = 'Error in SEO input: ';

// TODO: Refactor this into more reusible validators or use a library like zod to do this if we decide to use it in
// other places. @cartogram
export const schema = {
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

export interface SeoConfig<Schema extends Thing = Thing> {
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
   * `og:image` meta tag. If you pass an object or an array of objects, that will be used to generate `og:<type of
   * media>` meta tags. The `url` property should be the URL of the media. The `height` and `width` properties are
   * optional and should be the height and width of the media. The `altText` property is optional and should be a
   * description of the media.
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
   */
  jsonLd?: WithContext<Schema> | WithContext<Schema>[];
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
  /**
   * The `robots` property is used to specify the robots meta tag. This is used to tell search engines which pages
   * should be indexed and which should not.
   *
   * @see https://developers.google.com/search/reference/robots_meta_tag
   */
  robots?: RobotsOptions;
}

/**
 * @see https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
 */
export interface RobotsOptions {
  /**
   * Set the maximum size of an image preview for this page in a search results Can be one of the following:
   *
   * - `none` - No image preview is to be shown.
   * - `standard` - A default image preview may be shown.
   * - `large` - A larger image preview, up to the width of the viewport, may be shown.
   *
   * If no value is specified a default image preview size is used.
   */
  maxImagePreview?: 'none' | 'standard' | 'large';
  /**
   * A number representing the maximum of amount characters to use as a textual snippet for a search result. This value
   * can also be set to one of the following special values:
   *
   * - 0 - No snippet is to be shown. Equivalent to nosnippet.
   * - 1 - The Search engine will choose the snippet length that it believes is most effective to help users discover
   *   your content and direct users to your site
   * - -1 - No limit on the number of characters that can be shown in the snippet.
   */
  maxSnippet?: number;
  /**
   * The maximum number of seconds for videos on this page to show in search results. This value can also be set to one
   * of the following special values:
   *
   * - 0 - A static image may be used with the `maxImagePreview` setting.
   * - 1 - There is no limit to the size of the video preview.
   *
   * This applies to all forms of search results (at Google: web search, Google Images, Google Videos, Discover,
   * Assistant).
   */
  maxVideoPreview?: number;
  /**
   * Do not show a cached link in search results.
   */
  noArchive?: boolean;
  /**
   * Do not follow the links on this page.
   *
   * @see https://developers.google.com/search/docs/advanced/guidelines/qualify-outbound-links
   */
  noFollow?: boolean;
  /**
   * Do not index images on this page.
   */
  noImageIndex?: boolean;
  /**
   * Do not show this page, media, or resource in search results.
   */
  noIndex?: boolean;
  /**
   * Do not show a text snippet or video preview in the search results for this page.
   */
  noSnippet?: boolean;
  /**
   * Do not offer translation of this page in search results.
   */
  noTranslate?: boolean;
  /**
   * Do not show this page in search results after the specified date/time.
   */
  unavailableAfter?: string;
}

export interface LanguageAlternate {
  /**
   * Language code for the alternate page. This is used to generate the hreflang meta tag property.
   */
  language: string;
  /**
   * Whether the alternate page is the default page. This will add the `x-default` attribution to the language code.
   */
  default?: boolean;
  /**
   * The url of the alternate page. This is used to generate the hreflang meta tag property.
   */
  url: string;
}

export type SeoMedia = {
  /**
   * Used to generate og:<type of media> meta tag
   */
  type: 'image' | 'video' | 'audio';
  /**
   * The url value populates both url and secure_url and is used to infer the og:<type of media>:type meta tag.
   */
  url: Maybe<string> | undefined;
  /**
   * The height in pixels of the media. This is used to generate the og:<type of media>:height meta tag.
   */
  height: Maybe<number> | undefined;
  /**
   * The width in pixels of the media. This is used to generate the og:<type of media>:width meta tag.
   */
  width: Maybe<number> | undefined;
  /**
   * The alt text for the media. This is used to generate the og:<type of media>:alt meta tag.
   */
  altText: Maybe<string> | undefined;
};

type TagKey = 'title' | 'base' | 'meta' | 'link' | 'script';

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
  T extends SeoConfig<Schema> = SeoConfig<Schema>,
>(seoInput: T): CustomHeadTagObject[] {
  const output: CustomHeadTagObject[] = [];

  for (const seoKey of Object.keys(seoInput)) {
    const keyValue = seoInput[seoKey as keyof T];
    const values = ensureArray(keyValue);
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

          break;

        case 'url':
          content = validate(schema.url, value) as string;

          tagResults.push(
            generateTag('meta', {property: 'og:url', content}),
            generateTag('link', {rel: 'canonical', href: content}),
          );

          break;

        case 'handle':
          content = validate(schema.handle, value) as string;

          tagResults.push(
            generateTag('meta', {name: 'twitter:site', content}),
            generateTag('meta', {name: 'twitter:creator', content}),
          );

          break;

        case 'media': {
          const values = ensureArray(value as unknown as SeoConfig['media']);

          for (const media of values) {
            if (typeof media === 'string') {
              tagResults.push(
                generateTag('meta', {name: 'og:image', content: media}),
              );
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

        case 'jsonLd': {
          const tag = generateTag(
            'script',
            {
              type: 'application/ld+json',
              children: JSON.stringify(value),
            },
            // @ts-expect-error
            `json-ld-${value?.['@type'] || value?.name || ''}`,
          );

          tagResults.push(tag);

          break;
        }

        case 'alternates': {
          const alternates = ensureArray(
            value as unknown as SeoConfig['alternates'],
          );

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

        case 'robots':
          // Robots
          const {
            maxImagePreview,
            maxSnippet,
            maxVideoPreview,
            noArchive,
            noFollow,
            noImageIndex,
            noIndex,
            noSnippet,
            noTranslate,
            unavailableAfter,
          } = value as RobotsOptions;

          const robotsParams = [
            noArchive && 'noarchive',
            noImageIndex && 'noimageindex',
            noSnippet && 'nosnippet',
            noTranslate && `notranslate`,
            maxImagePreview && `max-image-preview:${maxImagePreview}`,
            maxSnippet && `max-snippet:${maxSnippet}`,
            maxVideoPreview && `max-video-preview:${maxVideoPreview}`,
            unavailableAfter && `unavailable_after:${unavailableAfter}`,
          ];

          let robotsParam =
            (noIndex ? 'noindex' : 'index') +
            ',' +
            (noFollow ? 'nofollow' : 'follow');

          for (let param of robotsParams) {
            if (param) {
              robotsParam += `,${param}`;
            }
          }

          tagResults.push(
            generateTag('meta', {name: 'robots', content: robotsParam}),
          );

          break;
      }

      return tagResults;
    });

    const entries: CustomHeadTagObject[] = tags
      .flat()
      .filter((value) => !!value);

    output.push(...entries);
  }

  return output.sort((a, b) => a.key.localeCompare(b.key));
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

type MetaTagProps =
  | ComponentPropsWithoutRef<'title'>
  | ComponentPropsWithoutRef<'base'>
  | ComponentPropsWithoutRef<'meta'>
  | ComponentPropsWithoutRef<'link'>
  | ComponentPropsWithoutRef<'script'>;

export function generateTag(
  tagName: 'script',
  input: ComponentPropsWithoutRef<'script'>,
  group?: string,
): CustomHeadTagObject;
export function generateTag(
  tagName: 'title',
  input: ComponentPropsWithoutRef<'title'>,
  group?: string,
): CustomHeadTagObject;
export function generateTag(
  tagName: 'base',
  input: ComponentPropsWithoutRef<'base'>,
  group?: string,
): CustomHeadTagObject;
export function generateTag(
  tagName: 'meta',
  input: ComponentPropsWithoutRef<'meta'>,
  group?: string,
): CustomHeadTagObject;
export function generateTag(
  tagName: 'link',
  input: ComponentPropsWithoutRef<'link'>,
  group?: string,
): CustomHeadTagObject;
export function generateTag(
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
    tag.children = input.children as string;
    tag.key = generateKey(tag, group);
    delete input.children;
    tag.props = input;
    return tag;
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

//**
// * Generate a unique key for a tag
// * @param tag - a generated tag object
// * @param group? - the group the tag belongs to
// * @returns - a unique key to be used for react
// */
export function generateKey(tag: CustomHeadTagObject, group?: string) {
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

  if (tagName === 'script') {
    return `${tagName}-${group}`;
  }

  return `${tagName}-${props.type}`;
}

export function ensureArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

export function validate(
  schema: {validate: (data: unknown) => unknown},
  data: unknown,
) {
  try {
    return schema.validate(data);
  } catch (error: unknown) {
    const message = (error as Error).message;

    // TODO: Discuss consistency of logging run time warnings/helpers
    console.warn(message);

    return data;
  }
}
