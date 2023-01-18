export interface BaseSeo {
  description?: any;
  media?: any;
  title?: any;
  titleTemplate?: any;
  url?: any;
}

export interface Seo {
  /**
   * The <title> HTML element defines the document's title that is shown in a
   * browser's title bar or a page's tab. It only contains text; tags within the
   * element are ignored.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title
   */
  title: string;
  /**
   * Generate the title from a template.
   *
   * Should include a `%s` placeholder for the title, for example `%s - My
   * Site`.
   */
  titleTemplate: string | null;
  /**
   * The media associated with the given page (images, videos, etc). If you pass
   * a string, it will be used as the `og:image` meta tag. If you pass an array
   * of objects, it will be used as the `og:<type of media>` meta tag. The `url`
   * property should be the URL of the media. The `height` and `width`
   * properties are optional and should be the height and width of the media.
   * The `alt` property is optional and should be a description of the media.
   *
   * Example:
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
   *
   */
  media: string | SeoMedia[];
  /**
   * The description of the page. This is used in the `name="description"` meta
   * tag as well as the `og:description` meta tag.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
   */
  description: string;
  /**
   * The canonical URL of the page. This is used to tell search engines which
   * URL is the canonical version of a page. This is useful when you have
   * multiple URLs that point to the same page. The value here will be used in
   * the `rel="canonical"` link tag as well as the `og:url` meta tag.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
   */
  url: string;
}

export type SeoMedia = {
  type: 'image' | 'video' | 'audio';
  url: string;
  height: number;
  width: number;
  alt: string;
};

export type TagKey = 'title' | 'base' | 'meta' | 'link' | 'script';

export interface HeadTag {
  tag: TagKey;
  props: Record<string, any>;
  children?: string;
  key?: string;
}

export type SchemaType =
  | 'Product'
  | 'ItemList'
  | 'Organization'
  | 'WebSite'
  | 'WebPage'
  | 'BlogPosting'
  | 'Thing';
