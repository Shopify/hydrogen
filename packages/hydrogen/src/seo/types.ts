import {Maybe} from '@shopify/storefront-kit-react/storefront-api-types';
import {WithContext} from 'schema-dts';

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
  media: Maybe<string> | undefined | SeoMedia[];
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
  url: string;
  // The height in pixels of the media. This is used to generate the og:<type of
  // media>:height meta tag.
  height: number;
  // The width in pixels of the media. This is used to generate the og:<type of
  // media>:width meta tag/
  width: number;
  // The alt text for the media. This is used to generate the og:<type of
  // media>:alt meta tag.
  alt: string;
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
