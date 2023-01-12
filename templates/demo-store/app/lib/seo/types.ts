export type SeoDescriptor = {
  type:
    | 'account'
    | 'article'
    | 'blog'
    | 'cart'
    | 'collection'
    | 'collections'
    | 'home'
    | 'page'
    | 'policies'
    | 'policy'
    | 'product'
    | 'root'
    | 'search'
    | null;
  site: string;
  title: string;
  titleTemplate?: string;
  bypassTitleTemplate?: boolean;
  defaultTitle: string;
  description: string;
  noindex: boolean;
  nofollow: boolean;
  url: string;
  twitter: Partial<TwitterOptions>;
  openGraph: Partial<OpenGraphOptions>;
  images: Partial<ImageOptions>[];
  alternates: Partial<AlternateOptions>[];
  tags: string[];
  robots: Partial<RobotsOptions>;
};

export interface TwitterOptions {
  card: string;
  site: string;
  description: string;
  handle: string;
}

export interface OpenGraphOptions {
  url: string;
  type: string;
  title: string;
  description: string;
  site: string;
  locale: string;
}

export interface OpenGraphProfileOptions {
  firstName: string;
  lastName: string;
  username: string;
  gender: string;
}

export interface OpenGraphArticleOptions {
  publishedTime: Date;
  modifiedTime: Date;
  expirationTime: Date;
  authors: string[];
  section: string;
  tags: string;
}

export interface RobotsOptions {
  noArchive: boolean;
  noSnippet: boolean;
  maxSnippet: number;
  unAvailableAfter: string;
}

export interface AlternateOptions {
  url: string;
  media: string;
  lang: string;
}

export interface ImageOptions {
  url: string;
  width: number;
  height: number;
  alt: string;
}
