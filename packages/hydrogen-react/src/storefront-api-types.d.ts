/**
 * THIS FILE IS AUTO-GENERATED, DO NOT EDIT
 * Based on Storefront API 2026-04
 * If changes need to happen to the types defined in this file, then generally the Storefront API needs to update. After it's updated, you can run `npm run graphql-types`.
 * Except custom Scalars, which are defined in the `codegen.ts` file
 */
/* eslint-disable */
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends {[key: string]: unknown}> = {[K in keyof T]: T[K]};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<T extends {[key: string]: unknown}, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | {[P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never};
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: {input: string; output: string};
  String: {input: string; output: string};
  Boolean: {input: boolean; output: boolean};
  Int: {input: number; output: number};
  Float: {input: number; output: number};
  Color: {input: string; output: string};
  DateTime: {input: string; output: string};
  Decimal: {input: string; output: string};
  HTML: {input: string; output: string};
  ISO8601DateTime: {input: unknown; output: unknown};
  JSON: {input: unknown; output: unknown};
  URL: {input: string; output: string};
  UnsignedInt64: {input: string; output: string};
};

/**
 * A version of the Shopify API. Each version has a unique handle in date-based format (YYYY-MM) or `unstable` for the development version.
 *
 * Shopify guarantees supported versions are stable. Unsupported versions include unstable and release candidate versions. Use the [`publicApiVersions`](https://shopify.dev/docs/api/storefront/current/queries/publicApiVersions) query to retrieve all available versions. Learn more about [Shopify API versioning](https://shopify.dev/docs/api/usage/versioning).
 *
 */
export type ApiVersion = {
  __typename?: 'ApiVersion';
  /** The human-readable name of the version. */
  displayName: Scalars['String']['output'];
  /** The unique identifier of an ApiVersion. All supported API versions have a date-based (YYYY-MM) or `unstable` handle. */
  handle: Scalars['String']['output'];
  /** Whether the version is actively supported by Shopify. Supported API versions are guaranteed to be stable. Unsupported API versions include unstable, release candidate, and end-of-life versions that are marked as unsupported. For more information, refer to [Versioning](https://shopify.dev/api/usage/versioning). */
  supported: Scalars['Boolean']['output'];
};

/**
 * The input fields for submitting Apple Pay payment method information for checkout.
 *
 */
export type ApplePayWalletContentInput = {
  /** The customer's billing address. */
  billingAddress: MailingAddressInput;
  /** The data for the Apple Pay wallet. */
  data: Scalars['String']['input'];
  /** The header data for the Apple Pay wallet. */
  header: ApplePayWalletHeaderInput;
  /** The last digits of the card used to create the payment. */
  lastDigits?: InputMaybe<Scalars['String']['input']>;
  /** The signature for the Apple Pay wallet. */
  signature: Scalars['String']['input'];
  /** The version for the Apple Pay wallet. */
  version: Scalars['String']['input'];
};

/**
 * The input fields for submitting wallet payment method information for checkout.
 *
 */
export type ApplePayWalletHeaderInput = {
  /** The application data for the Apple Pay wallet. */
  applicationData?: InputMaybe<Scalars['String']['input']>;
  /** The ephemeral public key for the Apple Pay wallet. */
  ephemeralPublicKey: Scalars['String']['input'];
  /** The public key hash for the Apple Pay wallet. */
  publicKeyHash: Scalars['String']['input'];
  /** The transaction ID for the Apple Pay wallet. */
  transactionId: Scalars['String']['input'];
};

/** Details about the gift card used on the checkout. */
export type AppliedGiftCard = Node & {
  __typename?: 'AppliedGiftCard';
  /** The amount that was taken from the gift card by applying it. */
  amountUsed: MoneyV2;
  /**
   * The amount that was taken from the gift card by applying it.
   * @deprecated Use `amountUsed` instead.
   */
  amountUsedV2: MoneyV2;
  /** The amount left on the gift card. */
  balance: MoneyV2;
  /**
   * The amount left on the gift card.
   * @deprecated Use `balance` instead.
   */
  balanceV2: MoneyV2;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The last characters of the gift card. */
  lastCharacters: Scalars['String']['output'];
  /** The amount that was applied to the checkout in its currency. */
  presentmentAmountUsed: MoneyV2;
};

/**
 * A post that belongs to a [`Blog`](https://shopify.dev/docs/api/storefront/current/objects/Blog). Each article includes content with optional HTML formatting, an excerpt for previews, [`ArticleAuthor`](https://shopify.dev/docs/api/storefront/current/objects/ArticleAuthor) information, and an associated [`Image`](https://shopify.dev/docs/api/storefront/current/objects/Image).
 *
 * Articles can be organized with tags and include [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) metadata. You can manage [comments](https://shopify.dev/docs/api/storefront/current/objects/Comment) when the blog's comment policy enables them.
 *
 */
export type Article = HasMetafields &
  Node &
  OnlineStorePublishable &
  Trackable & {
    __typename?: 'Article';
    /**
     * The article's author.
     * @deprecated Use `authorV2` instead.
     */
    author: ArticleAuthor;
    /** The article's author. */
    authorV2?: Maybe<ArticleAuthor>;
    /** The blog that the article belongs to. */
    blog: Blog;
    /** List of comments posted on the article. */
    comments: CommentConnection;
    /** Stripped content of the article, single line with HTML tags removed. */
    content: Scalars['String']['output'];
    /** The content of the article, complete with HTML formatting. */
    contentHtml: Scalars['HTML']['output'];
    /** Stripped excerpt of the article, single line with HTML tags removed. */
    excerpt?: Maybe<Scalars['String']['output']>;
    /** The excerpt of the article, complete with HTML formatting. */
    excerptHtml?: Maybe<Scalars['HTML']['output']>;
    /** A human-friendly unique string for the Article automatically generated from its title. */
    handle: Scalars['String']['output'];
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The image associated with the article. */
    image?: Maybe<Image>;
    /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
    metafield?: Maybe<Metafield>;
    /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
    metafields: Array<Maybe<Metafield>>;
    /** The URL used for viewing the resource on the shop's Online Store. Returns `null` if the resource is currently not published to the Online Store sales channel. */
    onlineStoreUrl?: Maybe<Scalars['URL']['output']>;
    /** The date and time when the article was published. */
    publishedAt: Scalars['DateTime']['output'];
    /** The article’s SEO information. */
    seo?: Maybe<Seo>;
    /**
     * A categorization that a article can be tagged with.
     *
     */
    tags: Array<Scalars['String']['output']>;
    /** The article’s name. */
    title: Scalars['String']['output'];
    /** URL parameters to be added to a page URL to track the origin of on-site search traffic for [analytics reporting](https://help.shopify.com/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports). Returns a result when accessed through the [search](https://shopify.dev/docs/api/storefront/current/queries/search) or [predictiveSearch](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries, otherwise returns null. */
    trackingParameters?: Maybe<Scalars['String']['output']>;
  };

/**
 * A post that belongs to a [`Blog`](https://shopify.dev/docs/api/storefront/current/objects/Blog). Each article includes content with optional HTML formatting, an excerpt for previews, [`ArticleAuthor`](https://shopify.dev/docs/api/storefront/current/objects/ArticleAuthor) information, and an associated [`Image`](https://shopify.dev/docs/api/storefront/current/objects/Image).
 *
 * Articles can be organized with tags and include [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) metadata. You can manage [comments](https://shopify.dev/docs/api/storefront/current/objects/Comment) when the blog's comment policy enables them.
 *
 */
export type ArticleCommentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * A post that belongs to a [`Blog`](https://shopify.dev/docs/api/storefront/current/objects/Blog). Each article includes content with optional HTML formatting, an excerpt for previews, [`ArticleAuthor`](https://shopify.dev/docs/api/storefront/current/objects/ArticleAuthor) information, and an associated [`Image`](https://shopify.dev/docs/api/storefront/current/objects/Image).
 *
 * Articles can be organized with tags and include [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) metadata. You can manage [comments](https://shopify.dev/docs/api/storefront/current/objects/Comment) when the blog's comment policy enables them.
 *
 */
export type ArticleContentArgs = {
  truncateAt?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * A post that belongs to a [`Blog`](https://shopify.dev/docs/api/storefront/current/objects/Blog). Each article includes content with optional HTML formatting, an excerpt for previews, [`ArticleAuthor`](https://shopify.dev/docs/api/storefront/current/objects/ArticleAuthor) information, and an associated [`Image`](https://shopify.dev/docs/api/storefront/current/objects/Image).
 *
 * Articles can be organized with tags and include [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) metadata. You can manage [comments](https://shopify.dev/docs/api/storefront/current/objects/Comment) when the blog's comment policy enables them.
 *
 */
export type ArticleExcerptArgs = {
  truncateAt?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * A post that belongs to a [`Blog`](https://shopify.dev/docs/api/storefront/current/objects/Blog). Each article includes content with optional HTML formatting, an excerpt for previews, [`ArticleAuthor`](https://shopify.dev/docs/api/storefront/current/objects/ArticleAuthor) information, and an associated [`Image`](https://shopify.dev/docs/api/storefront/current/objects/Image).
 *
 * Articles can be organized with tags and include [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) metadata. You can manage [comments](https://shopify.dev/docs/api/storefront/current/objects/Comment) when the blog's comment policy enables them.
 *
 */
export type ArticleMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * A post that belongs to a [`Blog`](https://shopify.dev/docs/api/storefront/current/objects/Blog). Each article includes content with optional HTML formatting, an excerpt for previews, [`ArticleAuthor`](https://shopify.dev/docs/api/storefront/current/objects/ArticleAuthor) information, and an associated [`Image`](https://shopify.dev/docs/api/storefront/current/objects/Image).
 *
 * Articles can be organized with tags and include [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) metadata. You can manage [comments](https://shopify.dev/docs/api/storefront/current/objects/Comment) when the blog's comment policy enables them.
 *
 */
export type ArticleMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/** The author of an article. */
export type ArticleAuthor = {
  __typename?: 'ArticleAuthor';
  /** The author's bio. */
  bio?: Maybe<Scalars['String']['output']>;
  /** The author’s email. */
  email: Scalars['String']['output'];
  /** The author's first name. */
  firstName: Scalars['String']['output'];
  /** The author's last name. */
  lastName: Scalars['String']['output'];
  /** The author's full name. */
  name: Scalars['String']['output'];
};

/**
 * An auto-generated type for paginating through multiple Articles.
 *
 */
export type ArticleConnection = {
  __typename?: 'ArticleConnection';
  /** A list of edges. */
  edges: Array<ArticleEdge>;
  /** A list of the nodes contained in ArticleEdge. */
  nodes: Array<Article>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one Article and a cursor during pagination.
 *
 */
export type ArticleEdge = {
  __typename?: 'ArticleEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of ArticleEdge. */
  node: Article;
};

/** The set of valid sort keys for the Article query. */
export type ArticleSortKeys =
  /** Sort by the `author` value. */
  | 'AUTHOR'
  /** Sort by the `blog_title` value. */
  | 'BLOG_TITLE'
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `published_at` value. */
  | 'PUBLISHED_AT'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `title` value. */
  | 'TITLE'
  /** Sort by the `updated_at` value. */
  | 'UPDATED_AT';

/**
 * A custom key-value pair for storing additional information on [carts](https://shopify.dev/docs/api/storefront/current/objects/Cart), [cart lines](https://shopify.dev/docs/api/storefront/current/objects/CartLine), [orders](https://shopify.dev/docs/api/storefront/current/objects/Order), and [order line items](https://shopify.dev/docs/api/storefront/current/objects/OrderLineItem). Common uses include gift wrapping requests, customer notes, and tracking whether a customer is a first-time buyer.
 *
 * Attributes set on a cart carry over to the resulting order after checkout. Use the [`cartAttributesUpdate`](https://shopify.dev/docs/api/storefront/current/mutations/cartAttributesUpdate) mutation to add or modify cart attributes. For a step-by-step guide, see [managing carts with the Storefront API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage).
 *
 */
export type Attribute = {
  __typename?: 'Attribute';
  /**
   * The key or name of the attribute. For example, `"customersFirstOrder"`.
   *
   */
  key: Scalars['String']['output'];
  /**
   * The value of the attribute. For example, `"true"`.
   *
   */
  value?: Maybe<Scalars['String']['output']>;
};

/**
 * A custom key-value pair that stores additional information on a [cart](https://shopify.dev/docs/api/storefront/current/objects/Cart) or [cart line](https://shopify.dev/docs/api/storefront/current/objects/CartLine). Attributes capture additional information like gift messages, special instructions, or custom order details. Learn more about [managing carts with the Storefront API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage).
 *
 */
export type AttributeInput = {
  /** Key or name of the attribute. */
  key: Scalars['String']['input'];
  /** Value of the attribute. */
  value: Scalars['String']['input'];
};

/**
 * An [automatic discount](https://help.shopify.com/manual/discounts/discount-methods/automatic-discounts) applied to a cart or checkout without requiring a discount code. Implements the [`DiscountApplication`](https://shopify.dev/docs/api/storefront/current/interfaces/DiscountApplication) interface.
 *
 * Includes the discount's title, value, and allocation details that specify how the discount amount distributes across entitled line items or shipping lines.
 *
 */
export type AutomaticDiscountApplication = DiscountApplication & {
  __typename?: 'AutomaticDiscountApplication';
  /** The method by which the discount's value is allocated to its entitled items. */
  allocationMethod: DiscountApplicationAllocationMethod;
  /** Which lines of targetType that the discount is allocated over. */
  targetSelection: DiscountApplicationTargetSelection;
  /** The type of line that the discount is applicable towards. */
  targetType: DiscountApplicationTargetType;
  /** The title of the application. */
  title: Scalars['String']['output'];
  /** The value of the discount application. */
  value: PricingValue;
};

/**
 * Defines the shared fields for items in a shopping cart. Implemented by [`CartLine`](https://shopify.dev/docs/api/storefront/current/objects/CartLine) for individual merchandise and [`ComponentizableCartLine`](https://shopify.dev/docs/api/storefront/current/objects/ComponentizableCartLine) for grouped merchandise like bundles.
 *
 * Each implementation includes the merchandise being purchased, quantity, cost breakdown, applied discounts, custom attributes, and any associated [`SellingPlan`](https://shopify.dev/docs/api/storefront/current/objects/SellingPlan).
 *
 */
export type BaseCartLine = {
  /** An attribute associated with the cart line. */
  attribute?: Maybe<Attribute>;
  /** The attributes associated with the cart line. Attributes are represented as key-value pairs. */
  attributes: Array<Attribute>;
  /** The cost of the merchandise that the buyer will pay for at checkout. The costs are subject to change and changes will be reflected at checkout. */
  cost: CartLineCost;
  /** The discounts that have been applied to the cart line. */
  discountAllocations: Array<
    | CartAutomaticDiscountAllocation
    | CartCodeDiscountAllocation
    | CartCustomDiscountAllocation
  >;
  /**
   * The estimated cost of the merchandise that the buyer will pay for at checkout. The estimated costs are subject to change and changes will be reflected at checkout.
   * @deprecated Use `cost` instead.
   */
  estimatedCost: CartLineEstimatedCost;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The merchandise that the buyer intends to purchase. */
  merchandise: Merchandise;
  /** The quantity of the merchandise that the customer intends to purchase. */
  quantity: Scalars['Int']['output'];
  /** The selling plan associated with the cart line and the effect that each selling plan has on variants when they're purchased. */
  sellingPlanAllocation?: Maybe<SellingPlanAllocation>;
};

/**
 * Defines the shared fields for items in a shopping cart. Implemented by [`CartLine`](https://shopify.dev/docs/api/storefront/current/objects/CartLine) for individual merchandise and [`ComponentizableCartLine`](https://shopify.dev/docs/api/storefront/current/objects/ComponentizableCartLine) for grouped merchandise like bundles.
 *
 * Each implementation includes the merchandise being purchased, quantity, cost breakdown, applied discounts, custom attributes, and any associated [`SellingPlan`](https://shopify.dev/docs/api/storefront/current/objects/SellingPlan).
 *
 */
export type BaseCartLineAttributeArgs = {
  key: Scalars['String']['input'];
};

/**
 * An auto-generated type for paginating through multiple BaseCartLines.
 *
 */
export type BaseCartLineConnection = {
  __typename?: 'BaseCartLineConnection';
  /** A list of edges. */
  edges: Array<BaseCartLineEdge>;
  /** A list of the nodes contained in BaseCartLineEdge. */
  nodes: Array<CartLine | ComponentizableCartLine>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one BaseCartLine and a cursor during pagination.
 *
 */
export type BaseCartLineEdge = {
  __typename?: 'BaseCartLineEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of BaseCartLineEdge. */
  node: CartLine | ComponentizableCartLine;
};

/**
 * A blog container for [`Article`](https://shopify.dev/docs/api/storefront/current/objects/Article) objects. Stores can have multiple blogs, for example to organize content by topic or purpose.
 *
 * Each blog provides access to its articles, contributing [`ArticleAuthor`](https://shopify.dev/docs/api/storefront/current/objects/ArticleAuthor) objects, and [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) information. You can retrieve articles individually [by handle](https://shopify.dev/docs/api/storefront/current/objects/Blog#field-Blog.fields.articleByHandle) or as a [paginated list](https://shopify.dev/docs/api/storefront/current/objects/Blog#field-Blog.fields.articles).
 *
 */
export type Blog = HasMetafields &
  Node &
  OnlineStorePublishable & {
    __typename?: 'Blog';
    /** Find an article by its handle. */
    articleByHandle?: Maybe<Article>;
    /** List of the blog's articles. */
    articles: ArticleConnection;
    /** The authors who have contributed to the blog. */
    authors: Array<ArticleAuthor>;
    /**
     * A human-friendly unique string for the Blog automatically generated from its title.
     *
     */
    handle: Scalars['String']['output'];
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
    metafield?: Maybe<Metafield>;
    /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
    metafields: Array<Maybe<Metafield>>;
    /** The URL used for viewing the resource on the shop's Online Store. Returns `null` if the resource is currently not published to the Online Store sales channel. */
    onlineStoreUrl?: Maybe<Scalars['URL']['output']>;
    /** The blog's SEO information. */
    seo?: Maybe<Seo>;
    /** The blogs’s title. */
    title: Scalars['String']['output'];
  };

/**
 * A blog container for [`Article`](https://shopify.dev/docs/api/storefront/current/objects/Article) objects. Stores can have multiple blogs, for example to organize content by topic or purpose.
 *
 * Each blog provides access to its articles, contributing [`ArticleAuthor`](https://shopify.dev/docs/api/storefront/current/objects/ArticleAuthor) objects, and [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) information. You can retrieve articles individually [by handle](https://shopify.dev/docs/api/storefront/current/objects/Blog#field-Blog.fields.articleByHandle) or as a [paginated list](https://shopify.dev/docs/api/storefront/current/objects/Blog#field-Blog.fields.articles).
 *
 */
export type BlogArticleByHandleArgs = {
  handle: Scalars['String']['input'];
};

/**
 * A blog container for [`Article`](https://shopify.dev/docs/api/storefront/current/objects/Article) objects. Stores can have multiple blogs, for example to organize content by topic or purpose.
 *
 * Each blog provides access to its articles, contributing [`ArticleAuthor`](https://shopify.dev/docs/api/storefront/current/objects/ArticleAuthor) objects, and [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) information. You can retrieve articles individually [by handle](https://shopify.dev/docs/api/storefront/current/objects/Blog#field-Blog.fields.articleByHandle) or as a [paginated list](https://shopify.dev/docs/api/storefront/current/objects/Blog#field-Blog.fields.articles).
 *
 */
export type BlogArticlesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<ArticleSortKeys>;
};

/**
 * A blog container for [`Article`](https://shopify.dev/docs/api/storefront/current/objects/Article) objects. Stores can have multiple blogs, for example to organize content by topic or purpose.
 *
 * Each blog provides access to its articles, contributing [`ArticleAuthor`](https://shopify.dev/docs/api/storefront/current/objects/ArticleAuthor) objects, and [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) information. You can retrieve articles individually [by handle](https://shopify.dev/docs/api/storefront/current/objects/Blog#field-Blog.fields.articleByHandle) or as a [paginated list](https://shopify.dev/docs/api/storefront/current/objects/Blog#field-Blog.fields.articles).
 *
 */
export type BlogMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * A blog container for [`Article`](https://shopify.dev/docs/api/storefront/current/objects/Article) objects. Stores can have multiple blogs, for example to organize content by topic or purpose.
 *
 * Each blog provides access to its articles, contributing [`ArticleAuthor`](https://shopify.dev/docs/api/storefront/current/objects/ArticleAuthor) objects, and [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) information. You can retrieve articles individually [by handle](https://shopify.dev/docs/api/storefront/current/objects/Blog#field-Blog.fields.articleByHandle) or as a [paginated list](https://shopify.dev/docs/api/storefront/current/objects/Blog#field-Blog.fields.articles).
 *
 */
export type BlogMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/**
 * An auto-generated type for paginating through multiple Blogs.
 *
 */
export type BlogConnection = {
  __typename?: 'BlogConnection';
  /** A list of edges. */
  edges: Array<BlogEdge>;
  /** A list of the nodes contained in BlogEdge. */
  nodes: Array<Blog>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one Blog and a cursor during pagination.
 *
 */
export type BlogEdge = {
  __typename?: 'BlogEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of BlogEdge. */
  node: Blog;
};

/** The set of valid sort keys for the Blog query. */
export type BlogSortKeys =
  /** Sort by the `handle` value. */
  | 'HANDLE'
  /** Sort by the `id` value. */
  | 'ID'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `title` value. */
  | 'TITLE';

/**
 * The store's [branding configuration](https://help.shopify.com/manual/promoting-marketing/managing-brand-assets), such as logos, colors, and slogan. Access this through the [`Shop`](https://shopify.dev/docs/api/storefront/current/objects/Shop#field-Shop.fields.brand) object to display consistent brand assets across your storefront.
 *
 */
export type Brand = {
  __typename?: 'Brand';
  /** The colors of the store's brand. */
  colors: BrandColors;
  /** The store's cover image. */
  coverImage?: Maybe<MediaImage>;
  /** The store's default logo. */
  logo?: Maybe<MediaImage>;
  /** The store's short description. */
  shortDescription?: Maybe<Scalars['String']['output']>;
  /** The store's slogan. */
  slogan?: Maybe<Scalars['String']['output']>;
  /** The store's preferred logo for square UI elements. */
  squareLogo?: Maybe<MediaImage>;
};

/**
 * A group of related colors for the shop's brand.
 *
 */
export type BrandColorGroup = {
  __typename?: 'BrandColorGroup';
  /** The background color. */
  background?: Maybe<Scalars['Color']['output']>;
  /** The foreground color. */
  foreground?: Maybe<Scalars['Color']['output']>;
};

/**
 * The colors of the shop's brand.
 *
 */
export type BrandColors = {
  __typename?: 'BrandColors';
  /** The shop's primary brand colors. */
  primary: Array<BrandColorGroup>;
  /** The shop's secondary brand colors. */
  secondary: Array<BrandColorGroup>;
};

/**
 * Identifies a B2B buyer for the [`@inContext`](https://shopify.dev/docs/storefronts/headless/bring-your-own-stack/b2b) directive. Pass this input to contextualize Storefront API queries with data like B2B-specific pricing, quantity rules, and quantity price breaks.
 *
 * For B2B customers with access to multiple company locations, include the [`companyLocationId`](https://shopify.dev/docs/api/storefront/latest/input-objects/BuyerInput#fields-companyLocationId) to specify which location they're purchasing for.
 *
 */
export type BuyerInput = {
  /** The identifier of the company location. */
  companyLocationId?: InputMaybe<Scalars['ID']['input']>;
  /** The customer access token retrieved from the [Customer Accounts API](https://shopify.dev/docs/api/customer#step-obtain-access-token). */
  customerAccessToken: Scalars['String']['input'];
};

/** Card brand, such as Visa or Mastercard, which can be used for payments. */
export type CardBrand =
  /** American Express. */
  | 'AMERICAN_EXPRESS'
  /** Diners Club. */
  | 'DINERS_CLUB'
  /** Discover. */
  | 'DISCOVER'
  /** JCB. */
  | 'JCB'
  /** Mastercard. */
  | 'MASTERCARD'
  /** Visa. */
  | 'VISA';

/**
 * A cart represents the merchandise that a buyer intends to purchase, and the estimated cost associated with the cart, throughout a customer's session.
 *
 * Use the [`checkoutUrl`](https://shopify.dev/docs/api/storefront/current/objects/Cart#field-checkoutUrl) field to direct buyers to Shopify's web checkout to complete their purchase.
 *
 * Learn more about [interacting with carts](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage).
 *
 */
export type Cart = HasMetafields &
  Node & {
    __typename?: 'Cart';
    /** The gift cards that have been applied to the cart. */
    appliedGiftCards: Array<AppliedGiftCard>;
    /** An attribute associated with the cart. */
    attribute?: Maybe<Attribute>;
    /** The attributes associated with the cart. Attributes are represented as key-value pairs. */
    attributes: Array<Attribute>;
    /** Information about the buyer that's interacting with the cart. */
    buyerIdentity: CartBuyerIdentity;
    /** The URL of the checkout for the cart. */
    checkoutUrl: Scalars['URL']['output'];
    /** The estimated costs that the buyer will pay at checkout. The costs are subject to change and changes will be reflected at checkout. The `cost` field uses the `buyerIdentity` field to determine [international pricing](https://shopify.dev/custom-storefronts/internationalization/international-pricing). */
    cost: CartCost;
    /** The date and time when the cart was created. */
    createdAt: Scalars['DateTime']['output'];
    /** The delivery properties of the cart. */
    delivery: CartDelivery;
    /**
     * The delivery groups available for the cart, based on the buyer identity default
     * delivery address preference or the default address of the logged-in customer.
     *
     */
    deliveryGroups: CartDeliveryGroupConnection;
    /** The discounts that have been applied to the entire cart. */
    discountAllocations: Array<
      | CartAutomaticDiscountAllocation
      | CartCodeDiscountAllocation
      | CartCustomDiscountAllocation
    >;
    /** The case-insensitive discount codes that the customer added at checkout. */
    discountCodes: Array<CartDiscountCode>;
    /**
     * The estimated costs that the buyer will pay at checkout. The estimated costs are subject to change and changes will be reflected at checkout. The `estimatedCost` field uses the `buyerIdentity` field to determine [international pricing](https://shopify.dev/custom-storefronts/internationalization/international-pricing).
     * @deprecated Use `cost` instead.
     */
    estimatedCost: CartEstimatedCost;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** A list of lines containing information about the items the customer intends to purchase. */
    lines: BaseCartLineConnection;
    /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
    metafield?: Maybe<Metafield>;
    /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
    metafields: Array<Maybe<Metafield>>;
    /** A note that's associated with the cart. For example, the note can be a personalized message to the buyer. */
    note?: Maybe<Scalars['String']['output']>;
    /** The total number of items in the cart. */
    totalQuantity: Scalars['Int']['output'];
    /** The date and time when the cart was updated. */
    updatedAt: Scalars['DateTime']['output'];
  };

/**
 * A cart represents the merchandise that a buyer intends to purchase, and the estimated cost associated with the cart, throughout a customer's session.
 *
 * Use the [`checkoutUrl`](https://shopify.dev/docs/api/storefront/current/objects/Cart#field-checkoutUrl) field to direct buyers to Shopify's web checkout to complete their purchase.
 *
 * Learn more about [interacting with carts](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage).
 *
 */
export type CartAttributeArgs = {
  key: Scalars['String']['input'];
};

/**
 * A cart represents the merchandise that a buyer intends to purchase, and the estimated cost associated with the cart, throughout a customer's session.
 *
 * Use the [`checkoutUrl`](https://shopify.dev/docs/api/storefront/current/objects/Cart#field-checkoutUrl) field to direct buyers to Shopify's web checkout to complete their purchase.
 *
 * Learn more about [interacting with carts](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage).
 *
 */
export type CartDeliveryGroupsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  withCarrierRates?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * A cart represents the merchandise that a buyer intends to purchase, and the estimated cost associated with the cart, throughout a customer's session.
 *
 * Use the [`checkoutUrl`](https://shopify.dev/docs/api/storefront/current/objects/Cart#field-checkoutUrl) field to direct buyers to Shopify's web checkout to complete their purchase.
 *
 * Learn more about [interacting with carts](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage).
 *
 */
export type CartLinesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * A cart represents the merchandise that a buyer intends to purchase, and the estimated cost associated with the cart, throughout a customer's session.
 *
 * Use the [`checkoutUrl`](https://shopify.dev/docs/api/storefront/current/objects/Cart#field-checkoutUrl) field to direct buyers to Shopify's web checkout to complete their purchase.
 *
 * Learn more about [interacting with carts](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage).
 *
 */
export type CartMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * A cart represents the merchandise that a buyer intends to purchase, and the estimated cost associated with the cart, throughout a customer's session.
 *
 * Use the [`checkoutUrl`](https://shopify.dev/docs/api/storefront/current/objects/Cart#field-checkoutUrl) field to direct buyers to Shopify's web checkout to complete their purchase.
 *
 * Learn more about [interacting with carts](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage).
 *
 */
export type CartMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/** A delivery address of the buyer that is interacting with the cart. */
export type CartAddress = CartDeliveryAddress;

/**
 * Specifies a delivery address for a cart. Provide either a [`deliveryAddress`](https://shopify.dev/docs/api/storefront/current/input-objects/CartAddressInput#fields-deliveryAddress) with full address details, or a [`copyFromCustomerAddressId`](https://shopify.dev/docs/api/storefront/current/input-objects/CartAddressInput#fields-copyFromCustomerAddressId) to copy from an existing customer address. Used by [`CartSelectableAddressInput`](https://shopify.dev/docs/api/storefront/current/input-objects/CartSelectableAddressInput) and [`CartSelectableAddressUpdateInput`](https://shopify.dev/docs/api/storefront/current/input-objects/CartSelectableAddressUpdateInput).
 *
 */
export type CartAddressInput = {
  /** Copies details from the customer address to an address on this cart. */
  copyFromCustomerAddressId?: InputMaybe<Scalars['ID']['input']>;
  /** A delivery address stored on this cart. */
  deliveryAddress?: InputMaybe<CartDeliveryAddressInput>;
};

/** Return type for `cartAttributesUpdate` mutation. */
export type CartAttributesUpdatePayload = {
  __typename?: 'CartAttributesUpdatePayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/**
 * A discount allocation [that applies automatically](https://help.shopify.com/manual/discounts/discount-methods/automatic-discounts) to a cart line when configured conditions are met. Unlike [`CartCodeDiscountAllocation`](https://shopify.dev/docs/api/storefront/current/objects/CartCodeDiscountAllocation), automatic discounts don't require customers to enter a code.
 *
 */
export type CartAutomaticDiscountAllocation = CartDiscountAllocation & {
  __typename?: 'CartAutomaticDiscountAllocation';
  /** The discount that have been applied on the cart line. */
  discountApplication: CartDiscountApplication;
  /** The discounted amount that has been applied to the cart line. */
  discountedAmount: MoneyV2;
  /** The type of line that the discount is applicable towards. */
  targetType: DiscountApplicationTargetType;
  /** The title of the allocated discount. */
  title: Scalars['String']['output'];
};

/** Return type for `cartBillingAddressUpdate` mutation. */
export type CartBillingAddressUpdatePayload = {
  __typename?: 'CartBillingAddressUpdatePayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/**
 * Contact information about the buyer interacting with a [cart](https://shopify.dev/docs/api/storefront/current/objects/Cart). The buyer's country determines [international pricing](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/markets/international-pricing) and should match their shipping address.
 *
 * For B2B scenarios, the [`purchasingCompany`](https://shopify.dev/docs/api/storefront/current/objects/CartBuyerIdentity#field-CartBuyerIdentity.fields.purchasingCompany) field identifies the company and location on whose behalf a business customer purchases. The [`preferences`](https://shopify.dev/docs/api/storefront/current/objects/CartBuyerIdentity#field-CartBuyerIdentity.fields.preferences) field stores delivery and wallet settings that prefill checkout fields to streamline the buying process.
 *
 */
export type CartBuyerIdentity = {
  __typename?: 'CartBuyerIdentity';
  /** The country where the buyer is located. */
  countryCode?: Maybe<CountryCode>;
  /** The customer account associated with the cart. */
  customer?: Maybe<Customer>;
  /**
   * An ordered set of delivery addresses tied to the buyer that is interacting with the cart.
   * The rank of the preferences is determined by the order of the addresses in the array. Preferences
   * can be used to populate relevant fields in the checkout flow.
   *
   * As of the `2025-01` release, `buyerIdentity.deliveryAddressPreferences` is deprecated.
   * Delivery addresses are now part of the `CartDelivery` object and managed with three new mutations:
   * - `cartDeliveryAddressAdd`
   * - `cartDeliveryAddressUpdate`
   * - `cartDeliveryAddressDelete`
   *
   * @deprecated Use `cart.delivery` instead.
   */
  deliveryAddressPreferences: Array<DeliveryAddress>;
  /** The email address of the buyer that's interacting with the cart. */
  email?: Maybe<Scalars['String']['output']>;
  /** The phone number of the buyer that's interacting with the cart. */
  phone?: Maybe<Scalars['String']['output']>;
  /**
   * A set of preferences tied to the buyer interacting with the cart. Preferences are used to prefill fields in at checkout to streamline information collection.
   * Preferences are not synced back to the cart if they are overwritten.
   *
   */
  preferences?: Maybe<CartPreferences>;
  /** The purchasing company associated with the cart. */
  purchasingCompany?: Maybe<PurchasingCompany>;
};

/**
 * The input fields for identifying the buyer associated with a cart. Buyer identity determines [international pricing](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/markets/international-pricing) and should match the customer's shipping address.
 *
 * Used by [`cartCreate`](https://shopify.dev/docs/api/storefront/current/mutations/cartCreate) and [`cartBuyerIdentityUpdate`](https://shopify.dev/docs/api/storefront/current/mutations/cartBuyerIdentityUpdate) to set contact information, location, and checkout preferences.
 *
 * > Note:
 * > Preferences prefill fields at checkout but don't sync back to the cart if overwritten.
 *
 */
export type CartBuyerIdentityInput = {
  /** The company location of the buyer that is interacting with the cart. */
  companyLocationId?: InputMaybe<Scalars['ID']['input']>;
  /** The country where the buyer is located. */
  countryCode?: InputMaybe<CountryCode>;
  /** The access token used to identify the customer associated with the cart. */
  customerAccessToken?: InputMaybe<Scalars['String']['input']>;
  /** The email address of the buyer that is interacting with the cart. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** The phone number of the buyer that is interacting with the cart. */
  phone?: InputMaybe<Scalars['String']['input']>;
  /**
   * A set of preferences tied to the buyer interacting with the cart. Preferences are used to prefill fields in at checkout to streamline information collection.
   * Preferences are not synced back to the cart if they are overwritten.
   *
   */
  preferences?: InputMaybe<CartPreferencesInput>;
};

/** Return type for `cartBuyerIdentityUpdate` mutation. */
export type CartBuyerIdentityUpdatePayload = {
  __typename?: 'CartBuyerIdentityUpdatePayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/**
 * Represents how credit card details are provided for a direct payment.
 *
 */
export type CartCardSource =
  /**
   * The credit card was provided by a third party and vaulted on their system.
   * Using this value requires a separate permission from Shopify.
   *
   */
  'SAVED_CREDIT_CARD';

/** Return type for `cartClone` mutation. */
export type CartClonePayload = {
  __typename?: 'CartClonePayload';
  /** The newly created cart without PII. This is a different cart from the source. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/**
 * A discount allocation applied to a cart line when a customer enters a [discount code](https://help.shopify.com/manual/discounts/discount-methods/discount-codes).
 *
 */
export type CartCodeDiscountAllocation = CartDiscountAllocation & {
  __typename?: 'CartCodeDiscountAllocation';
  /** The code used to apply the discount. */
  code: Scalars['String']['output'];
  /** The discount that have been applied on the cart line. */
  discountApplication: CartDiscountApplication;
  /** The discounted amount that has been applied to the cart line. */
  discountedAmount: MoneyV2;
  /** The type of line that the discount is applicable towards. */
  targetType: DiscountApplicationTargetType;
};

/** The completion action to checkout a cart. */
export type CartCompletionAction = CompletePaymentChallenge;

/** The required completion action to checkout a cart. */
export type CartCompletionActionRequired = {
  __typename?: 'CartCompletionActionRequired';
  /** The action required to complete the cart completion attempt. */
  action?: Maybe<CartCompletionAction>;
  /** The ID of the cart completion attempt. */
  id: Scalars['String']['output'];
};

/** The result of a cart completion attempt. */
export type CartCompletionAttemptResult =
  | CartCompletionActionRequired
  | CartCompletionFailed
  | CartCompletionProcessing
  | CartCompletionSuccess;

/** A failed completion to checkout a cart. */
export type CartCompletionFailed = {
  __typename?: 'CartCompletionFailed';
  /** The errors that caused the checkout to fail. */
  errors: Array<CompletionError>;
  /** The ID of the cart completion attempt. */
  id: Scalars['String']['output'];
};

/** A cart checkout completion that's still processing. */
export type CartCompletionProcessing = {
  __typename?: 'CartCompletionProcessing';
  /** The ID of the cart completion attempt. */
  id: Scalars['String']['output'];
  /** The number of milliseconds to wait before polling again. */
  pollDelay: Scalars['Int']['output'];
};

/** A successful completion to checkout a cart and a created order. */
export type CartCompletionSuccess = {
  __typename?: 'CartCompletionSuccess';
  /** The date and time when the job completed. */
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the cart completion attempt. */
  id: Scalars['String']['output'];
  /** The ID of the order that's created in Shopify. */
  orderId: Scalars['ID']['output'];
  /** The URL of the order confirmation in Shopify. */
  orderUrl: Scalars['URL']['output'];
};

/**
 * The estimated costs that a buyer will pay at checkout. The `Cart` object's [`cost`](https://shopify.dev/docs/api/storefront/current/objects/Cart#field-Cart.fields.cost) field returns this. The costs are subject to change and changes will be reflected at checkout. Costs reflect [international pricing](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/markets/international-pricing) based on the buyer's context.
 *
 * Amounts include the subtotal before taxes and cart-level discounts, the checkout charge amount excluding deferred payments, and the total. The subtotal and total amounts each include a corresponding boolean field indicating whether the value is an estimate.
 *
 */
export type CartCost = {
  __typename?: 'CartCost';
  /** The estimated amount, before taxes and discounts, for the customer to pay at checkout. The checkout charge amount doesn't include any deferred payments that'll be paid at a later date. If the cart has no deferred payments, then the checkout charge amount is equivalent to `subtotalAmount`. */
  checkoutChargeAmount: MoneyV2;
  /** The amount, before taxes and cart-level discounts, for the customer to pay. */
  subtotalAmount: MoneyV2;
  /** Whether the subtotal amount is estimated. */
  subtotalAmountEstimated: Scalars['Boolean']['output'];
  /** The total amount for the customer to pay. */
  totalAmount: MoneyV2;
  /** Whether the total amount is estimated. */
  totalAmountEstimated: Scalars['Boolean']['output'];
  /**
   * The duty amount for the customer to pay at checkout.
   * @deprecated Tax and duty amounts are no longer available and will be removed in a future version.
   * Please see [the changelog](https://shopify.dev/changelog/tax-and-duties-are-deprecated-in-storefront-cart-api)
   * for more information.
   *
   */
  totalDutyAmount?: Maybe<MoneyV2>;
  /**
   * Whether the total duty amount is estimated.
   * @deprecated Tax and duty amounts are no longer available and will be removed in a future version.
   * Please see [the changelog](https://shopify.dev/changelog/tax-and-duties-are-deprecated-in-storefront-cart-api)
   * for more information.
   *
   */
  totalDutyAmountEstimated: Scalars['Boolean']['output'];
  /**
   * The tax amount for the customer to pay at checkout.
   * @deprecated Tax and duty amounts are no longer available and will be removed in a future version.
   * Please see [the changelog](https://shopify.dev/changelog/tax-and-duties-are-deprecated-in-storefront-cart-api)
   * for more information.
   *
   */
  totalTaxAmount?: Maybe<MoneyV2>;
  /**
   * Whether the total tax amount is estimated.
   * @deprecated Tax and duty amounts are no longer available and will be removed in a future version.
   * Please see [the changelog](https://shopify.dev/changelog/tax-and-duties-are-deprecated-in-storefront-cart-api)
   * for more information.
   *
   */
  totalTaxAmountEstimated: Scalars['Boolean']['output'];
};

/** Return type for `cartCreate` mutation. */
export type CartCreatePayload = {
  __typename?: 'CartCreatePayload';
  /** The new cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/** The discounts automatically applied to the cart line based on prerequisites that have been met. */
export type CartCustomDiscountAllocation = CartDiscountAllocation & {
  __typename?: 'CartCustomDiscountAllocation';
  /** The discount that have been applied on the cart line. */
  discountApplication: CartDiscountApplication;
  /** The discounted amount that has been applied to the cart line. */
  discountedAmount: MoneyV2;
  /** The type of line that the discount is applicable towards. */
  targetType: DiscountApplicationTargetType;
  /** The title of the allocated discount. */
  title: Scalars['String']['output'];
};

/**
 * The delivery properties of the cart.
 *
 */
export type CartDelivery = {
  __typename?: 'CartDelivery';
  /** Selectable addresses to present to the buyer on the cart. */
  addresses: Array<CartSelectableAddress>;
};

/**
 * The delivery properties of the cart.
 *
 */
export type CartDeliveryAddressesArgs = {
  selected?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Represents a mailing address for customers and shipping. */
export type CartDeliveryAddress = {
  __typename?: 'CartDeliveryAddress';
  /** The first line of the address. Typically the street address or PO Box number. */
  address1?: Maybe<Scalars['String']['output']>;
  /**
   * The second line of the address. Typically the number of the apartment, suite, or unit.
   *
   */
  address2?: Maybe<Scalars['String']['output']>;
  /** The name of the city, district, village, or town. */
  city?: Maybe<Scalars['String']['output']>;
  /** The name of the customer's company or organization. */
  company?: Maybe<Scalars['String']['output']>;
  /**
   * The two-letter code for the country of the address.
   *
   * For example, US.
   *
   */
  countryCode?: Maybe<Scalars['String']['output']>;
  /** The first name of the customer. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** A formatted version of the address, customized by the provided arguments. */
  formatted: Array<Scalars['String']['output']>;
  /** A comma-separated list of the values for city, province, and country. */
  formattedArea?: Maybe<Scalars['String']['output']>;
  /** The last name of the customer. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** The latitude coordinate of the customer address. */
  latitude?: Maybe<Scalars['Float']['output']>;
  /** The longitude coordinate of the customer address. */
  longitude?: Maybe<Scalars['Float']['output']>;
  /** The full name of the customer, based on firstName and lastName. */
  name?: Maybe<Scalars['String']['output']>;
  /**
   * A unique phone number for the customer.
   *
   * Formatted using E.164 standard. For example, _+16135551111_.
   *
   */
  phone?: Maybe<Scalars['String']['output']>;
  /**
   * The alphanumeric code for the region.
   *
   * For example, ON.
   *
   */
  provinceCode?: Maybe<Scalars['String']['output']>;
  /** The zip or postal code of the address. */
  zip?: Maybe<Scalars['String']['output']>;
};

/** Represents a mailing address for customers and shipping. */
export type CartDeliveryAddressFormattedArgs = {
  withCompany?: InputMaybe<Scalars['Boolean']['input']>;
  withName?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The input fields to create or update a cart address. */
export type CartDeliveryAddressInput = {
  /**
   * The first line of the address. Typically the street address or PO Box number.
   *
   */
  address1?: InputMaybe<Scalars['String']['input']>;
  /**
   * The second line of the address. Typically the number of the apartment, suite, or unit.
   *
   */
  address2?: InputMaybe<Scalars['String']['input']>;
  /**
   * The name of the city, district, village, or town.
   *
   */
  city?: InputMaybe<Scalars['String']['input']>;
  /**
   * The name of the customer's company or organization.
   *
   */
  company?: InputMaybe<Scalars['String']['input']>;
  /** The name of the country. */
  countryCode?: InputMaybe<CountryCode>;
  /** The first name of the customer. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** The last name of the customer. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /**
   * A unique phone number for the customer.
   *
   * Formatted using E.164 standard. For example, _+16135551111_.
   *
   */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** The region of the address, such as the province, state, or district. */
  provinceCode?: InputMaybe<Scalars['String']['input']>;
  /** The zip or postal code of the address. */
  zip?: InputMaybe<Scalars['String']['input']>;
};

/** Return type for `cartDeliveryAddressesAdd` mutation. */
export type CartDeliveryAddressesAddPayload = {
  __typename?: 'CartDeliveryAddressesAddPayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/** Return type for `cartDeliveryAddressesRemove` mutation. */
export type CartDeliveryAddressesRemovePayload = {
  __typename?: 'CartDeliveryAddressesRemovePayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/** Return type for `cartDeliveryAddressesReplace` mutation. */
export type CartDeliveryAddressesReplacePayload = {
  __typename?: 'CartDeliveryAddressesReplacePayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/** Return type for `cartDeliveryAddressesUpdate` mutation. */
export type CartDeliveryAddressesUpdatePayload = {
  __typename?: 'CartDeliveryAddressesUpdatePayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/** Preferred location used to find the closest pick up point based on coordinates. */
export type CartDeliveryCoordinatesPreference = {
  __typename?: 'CartDeliveryCoordinatesPreference';
  /**
   * The two-letter code for the country of the preferred location.
   *
   * For example, US.
   *
   */
  countryCode: CountryCode;
  /** The geographic latitude for a given location. Coordinates are required in order to set pickUpHandle for pickup points. */
  latitude: Scalars['Float']['output'];
  /** The geographic longitude for a given location. Coordinates are required in order to set pickUpHandle for pickup points. */
  longitude: Scalars['Float']['output'];
};

/** Preferred location used to find the closest pick up point based on coordinates. */
export type CartDeliveryCoordinatesPreferenceInput = {
  /**
   * The two-letter code for the country of the preferred location.
   *
   * For example, US.
   *
   */
  countryCode: CountryCode;
  /** The geographic latitude for a given location. Coordinates are required in order to set pickUpHandle for pickup points. */
  latitude: Scalars['Float']['input'];
  /** The geographic longitude for a given location. Coordinates are required in order to set pickUpHandle for pickup points. */
  longitude: Scalars['Float']['input'];
};

/**
 * Groups cart line items that share the same delivery destination. Each group provides the available [`CartDeliveryOption`](https://shopify.dev/docs/api/storefront/current/objects/CartDeliveryOption) choices for that address, along with the customer's selected option.
 *
 * Access through the [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart) object's `deliveryGroups` field. Items are grouped by merchandise type (one-time purchase vs subscription), allowing different delivery methods for each.
 *
 */
export type CartDeliveryGroup = {
  __typename?: 'CartDeliveryGroup';
  /** A list of cart lines for the delivery group. */
  cartLines: BaseCartLineConnection;
  /** The destination address for the delivery group. */
  deliveryAddress: MailingAddress;
  /** The delivery options available for the delivery group. */
  deliveryOptions: Array<CartDeliveryOption>;
  /** The type of merchandise in the delivery group. */
  groupType: CartDeliveryGroupType;
  /** The ID for the delivery group. */
  id: Scalars['ID']['output'];
  /** The selected delivery option for the delivery group. */
  selectedDeliveryOption?: Maybe<CartDeliveryOption>;
};

/**
 * Groups cart line items that share the same delivery destination. Each group provides the available [`CartDeliveryOption`](https://shopify.dev/docs/api/storefront/current/objects/CartDeliveryOption) choices for that address, along with the customer's selected option.
 *
 * Access through the [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart) object's `deliveryGroups` field. Items are grouped by merchandise type (one-time purchase vs subscription), allowing different delivery methods for each.
 *
 */
export type CartDeliveryGroupCartLinesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * An auto-generated type for paginating through multiple CartDeliveryGroups.
 *
 */
export type CartDeliveryGroupConnection = {
  __typename?: 'CartDeliveryGroupConnection';
  /** A list of edges. */
  edges: Array<CartDeliveryGroupEdge>;
  /** A list of the nodes contained in CartDeliveryGroupEdge. */
  nodes: Array<CartDeliveryGroup>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one CartDeliveryGroup and a cursor during pagination.
 *
 */
export type CartDeliveryGroupEdge = {
  __typename?: 'CartDeliveryGroupEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of CartDeliveryGroupEdge. */
  node: CartDeliveryGroup;
};

/**
 * Defines what type of merchandise is in the delivery group.
 *
 */
export type CartDeliveryGroupType =
  /**
   * The delivery group only contains merchandise that is either a one time purchase or a first delivery of
   * subscription merchandise.
   *
   */
  | 'ONE_TIME_PURCHASE'
  /** The delivery group only contains subscription merchandise. */
  | 'SUBSCRIPTION';

/** The input fields for the cart's delivery properties. */
export type CartDeliveryInput = {
  /**
   * Selectable addresses to present to the buyer on the cart.
   *
   * The input must not contain more than `250` values.
   */
  addresses?: InputMaybe<Array<CartSelectableAddressInput>>;
};

/**
 * A shipping or delivery choice available to customers during checkout. Each option includes a title, estimated cost, and delivery method type such as shipping or local pickup.
 *
 * Returned by the [`CartDeliveryGroup`](https://shopify.dev/docs/api/storefront/current/objects/CartDeliveryGroup) object's [`deliveryOptions`](https://shopify.dev/docs/api/storefront/current/objects/CartDeliveryGroup#field-CartDeliveryGroup.fields.deliveryOptions) field and [`selectedDeliveryOption`](https://shopify.dev/docs/api/storefront/current/objects/CartDeliveryGroup#field-CartDeliveryGroup.fields.selectedDeliveryOption) field.
 *
 */
export type CartDeliveryOption = {
  __typename?: 'CartDeliveryOption';
  /** The code of the delivery option. */
  code?: Maybe<Scalars['String']['output']>;
  /** The method for the delivery option. */
  deliveryMethodType: DeliveryMethodType;
  /** The description of the delivery option. */
  description?: Maybe<Scalars['String']['output']>;
  /** The estimated cost for the delivery option. */
  estimatedCost: MoneyV2;
  /** The unique identifier of the delivery option. */
  handle: Scalars['String']['output'];
  /** The title of the delivery option. */
  title?: Maybe<Scalars['String']['output']>;
};

/**
 * A set of preferences tied to the buyer interacting with the cart. Preferences are used to prefill fields in at checkout to streamline information collection.
 * Preferences are not synced back to the cart if they are overwritten.
 *
 */
export type CartDeliveryPreference = {
  __typename?: 'CartDeliveryPreference';
  /** Preferred location used to find the closest pick up point based on coordinates. */
  coordinates?: Maybe<CartDeliveryCoordinatesPreference>;
  /** The preferred delivery methods such as shipping, local pickup or through pickup points. */
  deliveryMethod: Array<PreferenceDeliveryMethodType>;
  /**
   * The pickup handle prefills checkout fields with the location for either local pickup or pickup points delivery methods.
   * It accepts both location ID for local pickup and external IDs for pickup points.
   *
   */
  pickupHandle: Array<Scalars['String']['output']>;
};

/** Delivery preferences can be used to prefill the delivery section at checkout. */
export type CartDeliveryPreferenceInput = {
  /** The coordinates of a delivery location in order of preference. */
  coordinates?: InputMaybe<CartDeliveryCoordinatesPreferenceInput>;
  /**
   * The preferred delivery methods such as shipping, local pickup or through pickup points.
   *
   * The input must not contain more than `250` values.
   */
  deliveryMethod?: InputMaybe<Array<PreferenceDeliveryMethodType>>;
  /**
   * The pickup handle prefills checkout fields with the location for either local pickup or pickup points delivery methods.
   * It accepts both location ID for local pickup and external IDs for pickup points.
   *
   * The input must not contain more than `250` values.
   */
  pickupHandle?: InputMaybe<Array<Scalars['String']['input']>>;
};

/**
 * The input fields for submitting direct payment method information for checkout.
 *
 */
export type CartDirectPaymentMethodInput = {
  /** Indicates if the customer has accepted the subscription terms. Defaults to false. */
  acceptedSubscriptionTerms?: InputMaybe<Scalars['Boolean']['input']>;
  /** The customer's billing address. */
  billingAddress: MailingAddressInput;
  /** The source of the credit card payment. */
  cardSource?: InputMaybe<CartCardSource>;
  /** The session ID for the direct payment method used to create the payment. */
  sessionId: Scalars['String']['input'];
};

/**
 * A common interface for querying discount allocations regardless of how the discount was applied ([automatic](https://help.shopify.com/manual/discounts/discount-methods/automatic-discounts), [code](https://help.shopify.com/manual/discounts/discount-methods/discount-codes), or custom). Each implementation represents a different discount source.
 *
 * Tracks how a discount distributes across [cart lines](https://shopify.dev/docs/api/storefront/current/objects/CartLine). Each allocation includes the [`CartDiscountApplication`](https://shopify.dev/docs/api/storefront/current/objects/CartDiscountApplication) details, the discounted amount, and whether the discount targets line items or shipping.
 *
 */
export type CartDiscountAllocation = {
  /** The discount that have been applied on the cart line. */
  discountApplication: CartDiscountApplication;
  /** The discounted amount that has been applied to the cart line. */
  discountedAmount: MoneyV2;
  /** The type of line that the discount is applicable towards. */
  targetType: DiscountApplicationTargetType;
};

/**
 * Captures the intent of a discount source at the time it was applied to a cart. This includes the discount value, how it's allocated across entitled items, and which line types it targets.
 *
 * The actual discounted amounts on specific cart lines are represented by [`CartDiscountAllocation`](https://shopify.dev/docs/api/storefront/current/interfaces/CartDiscountAllocation) objects, which reference this application.
 *
 */
export type CartDiscountApplication = {
  __typename?: 'CartDiscountApplication';
  /** The method by which the discount's value is allocated to its entitled items. */
  allocationMethod: DiscountApplicationAllocationMethod;
  /** Which lines of targetType that the discount is allocated over. */
  targetSelection: DiscountApplicationTargetSelection;
  /** The type of line that the discount is applicable towards. */
  targetType: DiscountApplicationTargetType;
  /** The value of the discount application. */
  value: PricingValue;
};

/**
 * A discount code applied to a [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart). Discount codes are case-insensitive and can be added using the [`cartDiscountCodesUpdate`](https://shopify.dev/docs/api/storefront/current/mutations/cartDiscountCodesUpdate) mutation.
 *
 * The [`applicable`](https://shopify.dev/docs/api/storefront/current/objects/CartDiscountCode#field-CartDiscountCode.fields.applicable) field indicates whether the code applies to the cart's current contents, which might change as items are added or removed.
 *
 */
export type CartDiscountCode = {
  __typename?: 'CartDiscountCode';
  /** Whether the discount code is applicable to the cart's current contents. */
  applicable: Scalars['Boolean']['output'];
  /** The code for the discount. */
  code: Scalars['String']['output'];
};

/** Return type for `cartDiscountCodesUpdate` mutation. */
export type CartDiscountCodesUpdatePayload = {
  __typename?: 'CartDiscountCodesUpdatePayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/**
 * Error codes returned by [`CartUserError`](https://shopify.dev/docs/api/storefront/current/objects/CartUserError) during cart mutations. Covers validation failures for addresses, quantities, delivery options, merchandise lines, discount codes, and metafields.
 *
 */
export type CartErrorCode =
  /** The specified address field contains emojis. */
  | 'ADDRESS_FIELD_CONTAINS_EMOJIS'
  /** The specified address field contains HTML tags. */
  | 'ADDRESS_FIELD_CONTAINS_HTML_TAGS'
  /** The specified address field contains a URL. */
  | 'ADDRESS_FIELD_CONTAINS_URL'
  /** The specified address field does not match the expected pattern. */
  | 'ADDRESS_FIELD_DOES_NOT_MATCH_EXPECTED_PATTERN'
  /** The specified address field is required. */
  | 'ADDRESS_FIELD_IS_REQUIRED'
  /** The specified address field is too long. */
  | 'ADDRESS_FIELD_IS_TOO_LONG'
  /** Bundles and addons cannot be mixed. */
  | 'BUNDLES_AND_ADDONS_CANNOT_BE_MIXED'
  /** Buyer cannot purchase for company location. */
  | 'BUYER_CANNOT_PURCHASE_FOR_COMPANY_LOCATION'
  /** The cart is too large to save. */
  | 'CART_TOO_LARGE'
  /** The specified gift card recipient is invalid. */
  | 'GIFT_CARD_RECIPIENT_INVALID'
  /** The input value is invalid. */
  | 'INVALID'
  /** Company location not found or not allowed. */
  | 'INVALID_COMPANY_LOCATION'
  /** The delivery address was not found. */
  | 'INVALID_DELIVERY_ADDRESS_ID'
  /** Delivery group was not found in cart. */
  | 'INVALID_DELIVERY_GROUP'
  /** Delivery option was not valid. */
  | 'INVALID_DELIVERY_OPTION'
  /** The quantity must be a multiple of the specified increment. */
  | 'INVALID_INCREMENT'
  /** Merchandise line was not found in cart. */
  | 'INVALID_MERCHANDISE_LINE'
  /** The metafields were not valid. */
  | 'INVALID_METAFIELDS'
  /** The payment wasn't valid. */
  | 'INVALID_PAYMENT'
  /** The payment is invalid. Deferred payment is required. */
  | 'INVALID_PAYMENT_DEFERRED_PAYMENT_REQUIRED'
  /** Cannot update payment on an empty cart */
  | 'INVALID_PAYMENT_EMPTY_CART'
  /** The given zip code is invalid for the provided country. */
  | 'INVALID_ZIP_CODE_FOR_COUNTRY'
  /** The given zip code is invalid for the provided province. */
  | 'INVALID_ZIP_CODE_FOR_PROVINCE'
  /** The input value should be less than the maximum value allowed. */
  | 'LESS_THAN'
  /** The quantity must be below the specified maximum for the item. */
  | 'MAXIMUM_EXCEEDED'
  /** An error occurred while processing cart transformations. */
  | 'MERCHANDISE_LINE_TRANSFORMERS_RUN_ERROR'
  /** Item cannot be purchased as configured. */
  | 'MERCHANDISE_NOT_APPLICABLE'
  /** The quantity must be above the specified minimum for the item. */
  | 'MINIMUM_NOT_MET'
  /** The customer access token is required when setting a company location. */
  | 'MISSING_CUSTOMER_ACCESS_TOKEN'
  /** Missing discount code. */
  | 'MISSING_DISCOUNT_CODE'
  /** Missing note. */
  | 'MISSING_NOTE'
  /** The note length must be below the specified maximum. */
  | 'NOTE_TOO_LONG'
  /** Only one delivery address can be selected. */
  | 'ONLY_ONE_DELIVERY_ADDRESS_CAN_BE_SELECTED'
  /** Cannot reference existing parent lines by variant_id. */
  | 'PARENT_LINE_INVALID_REFERENCE'
  /** Parent line nesting is too deep or circular. */
  | 'PARENT_LINE_NESTING_TOO_DEEP'
  /** Parent line not found. */
  | 'PARENT_LINE_NOT_FOUND'
  /** Nested cartlines are blocked due to an incompatibility. */
  | 'PARENT_LINE_OPERATION_BLOCKED'
  /** Credit card has expired. */
  | 'PAYMENTS_CREDIT_CARD_BASE_EXPIRED'
  /** Credit card gateway is not supported. */
  | 'PAYMENTS_CREDIT_CARD_BASE_GATEWAY_NOT_SUPPORTED'
  /** Credit card error. */
  | 'PAYMENTS_CREDIT_CARD_GENERIC'
  /** Credit card month is invalid. */
  | 'PAYMENTS_CREDIT_CARD_MONTH_INCLUSION'
  /** Credit card number is invalid. */
  | 'PAYMENTS_CREDIT_CARD_NUMBER_INVALID'
  /** Credit card number format is invalid. */
  | 'PAYMENTS_CREDIT_CARD_NUMBER_INVALID_FORMAT'
  /** Credit card verification value is blank. */
  | 'PAYMENTS_CREDIT_CARD_VERIFICATION_VALUE_BLANK'
  /** Credit card verification value is invalid for card type. */
  | 'PAYMENTS_CREDIT_CARD_VERIFICATION_VALUE_INVALID_FOR_CARD_TYPE'
  /** Credit card has expired. */
  | 'PAYMENTS_CREDIT_CARD_YEAR_EXPIRED'
  /** Credit card expiry year is invalid. */
  | 'PAYMENTS_CREDIT_CARD_YEAR_INVALID_EXPIRY_YEAR'
  /** The payment method is not applicable. */
  | 'PAYMENT_METHOD_NOT_APPLICABLE'
  /** The payment method is not supported. */
  | 'PAYMENT_METHOD_NOT_SUPPORTED'
  /** The delivery group is in a pending state. */
  | 'PENDING_DELIVERY_GROUPS'
  /** The given province cannot be found. */
  | 'PROVINCE_NOT_FOUND'
  /** Selling plan is not applicable. */
  | 'SELLING_PLAN_NOT_APPLICABLE'
  /** An error occurred while saving the cart. */
  | 'SERVICE_UNAVAILABLE'
  /** Too many delivery addresses on Cart. */
  | 'TOO_MANY_DELIVERY_ADDRESSES'
  /** A general error occurred during address validation. */
  | 'UNSPECIFIED_ADDRESS_ERROR'
  /** Validation failed. */
  | 'VALIDATION_CUSTOM'
  /** Variant can only be purchased with a selling plan. */
  | 'VARIANT_REQUIRES_SELLING_PLAN'
  /** The given zip code is unsupported. */
  | 'ZIP_CODE_NOT_SUPPORTED';

/**
 * The estimated costs that the buyer pays at checkout. Uses [`CartBuyerIdentity`](https://shopify.dev/docs/api/storefront/current/objects/CartBuyerIdentity) to determine [international pricing](https://shopify.dev/docs/custom-storefronts/internationalization/international-pricing).
 *
 * Includes the subtotal, total amount, duties, and taxes. The [`checkoutChargeAmount`](https://shopify.dev/docs/api/storefront/current/objects/CartEstimatedCost#field-CartEstimatedCost.fields.checkoutChargeAmount) field excludes deferred payments that are charged later, making it useful for displaying what the customer pays immediately.
 *
 */
export type CartEstimatedCost = {
  __typename?: 'CartEstimatedCost';
  /** The estimated amount, before taxes and discounts, for the customer to pay at checkout. The checkout charge amount doesn't include any deferred payments that'll be paid at a later date. If the cart has no deferred payments, then the checkout charge amount is equivalent to`subtotal_amount`. */
  checkoutChargeAmount: MoneyV2;
  /** The estimated amount, before taxes and discounts, for the customer to pay. */
  subtotalAmount: MoneyV2;
  /** The estimated total amount for the customer to pay. */
  totalAmount: MoneyV2;
  /** The estimated duty amount for the customer to pay at checkout. */
  totalDutyAmount?: Maybe<MoneyV2>;
  /** The estimated tax amount for the customer to pay at checkout. */
  totalTaxAmount?: Maybe<MoneyV2>;
};

/**
 * The input fields for submitting a billing address without a selected payment method.
 *
 */
export type CartFreePaymentMethodInput = {
  /** The customer's billing address. */
  billingAddress: MailingAddressInput;
};

/** Return type for `cartGiftCardCodesAdd` mutation. */
export type CartGiftCardCodesAddPayload = {
  __typename?: 'CartGiftCardCodesAddPayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/** Return type for `cartGiftCardCodesRemove` mutation. */
export type CartGiftCardCodesRemovePayload = {
  __typename?: 'CartGiftCardCodesRemovePayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/** Return type for `cartGiftCardCodesUpdate` mutation. */
export type CartGiftCardCodesUpdatePayload = {
  __typename?: 'CartGiftCardCodesUpdatePayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/**
 * The input fields for creating a [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart). Used by the [`cartCreate`](https://shopify.dev/docs/api/storefront/current/mutations/cartCreate) mutation.
 *
 * Accepts merchandise lines, discount codes, gift card codes, and a note. You can also set custom attributes, metafields, buyer identity for international pricing, and delivery addresses.
 *
 */
export type CartInput = {
  /**
   * An array of key-value pairs that contains additional information about the cart.
   *
   * The input must not contain more than `250` values.
   */
  attributes?: InputMaybe<Array<AttributeInput>>;
  /**
   * The customer associated with the cart. Used to determine [international pricing]
   * (https://shopify.dev/custom-storefronts/internationalization/international-pricing).
   * Buyer identity should match the customer's shipping address.
   *
   */
  buyerIdentity?: InputMaybe<CartBuyerIdentityInput>;
  /** The delivery-related fields for the cart. */
  delivery?: InputMaybe<CartDeliveryInput>;
  /**
   * The case-insensitive discount codes that the customer added at checkout.
   *
   * The input must not contain more than `250` values.
   */
  discountCodes?: InputMaybe<Array<Scalars['String']['input']>>;
  /**
   * The case-insensitive gift card codes.
   *
   * The input must not contain more than `250` values.
   */
  giftCardCodes?: InputMaybe<Array<Scalars['String']['input']>>;
  /**
   * A list of merchandise lines to add to the cart.
   *
   * The input must not contain more than `250` values.
   */
  lines?: InputMaybe<Array<CartLineInput>>;
  /**
   * The metafields to associate with this cart.
   *
   * The input must not contain more than `250` values.
   */
  metafields?: InputMaybe<Array<CartInputMetafieldInput>>;
  /**
   * A note that's associated with the cart. For example, the note can be a personalized message to the buyer.
   *
   */
  note?: InputMaybe<Scalars['String']['input']>;
};

/**
 * The input fields for a cart metafield value to set.
 *
 * Cart metafields will be copied to order metafields at order creation time if there is a matching order metafield definition with the [`cart to order copyable`](https://shopify.dev/docs/apps/build/metafields/use-metafield-capabilities#cart-to-order-copyable) capability enabled.
 *
 */
export type CartInputMetafieldInput = {
  /** The key name of the metafield. */
  key: Scalars['String']['input'];
  /**
   * The type of data that the cart metafield stores.
   * The type of data must be a [supported type](https://shopify.dev/apps/metafields/types).
   *
   */
  type: Scalars['String']['input'];
  /**
   * The data to store in the cart metafield. The data is always stored as a string, regardless of the metafield's type.
   *
   */
  value: Scalars['String']['input'];
};

/**
 * An item in a customer's [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart) representing a product variant they intend to purchase. Each cart line tracks the merchandise, quantity, cost breakdown, and any applied discounts.
 *
 * Cart lines can include custom attributes for additional information like gift wrapping requests, and can be associated with a [`SellingPlanAllocation`](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanAllocation) for purchase options like subscriptions, pre-orders, or try-before-you-buy. The [`instructions`](https://shopify.dev/docs/api/storefront/current/objects/CartLine#field-CartLine.fields.instructions) field indicates whether the line can be removed or have its quantity updated.
 *
 */
export type CartLine = BaseCartLine &
  Node & {
    __typename?: 'CartLine';
    /** An attribute associated with the cart line. */
    attribute?: Maybe<Attribute>;
    /** The attributes associated with the cart line. Attributes are represented as key-value pairs. */
    attributes: Array<Attribute>;
    /** The cost of the merchandise that the buyer will pay for at checkout. The costs are subject to change and changes will be reflected at checkout. */
    cost: CartLineCost;
    /** The discounts that have been applied to the cart line. */
    discountAllocations: Array<
      | CartAutomaticDiscountAllocation
      | CartCodeDiscountAllocation
      | CartCustomDiscountAllocation
    >;
    /**
     * The estimated cost of the merchandise that the buyer will pay for at checkout. The estimated costs are subject to change and changes will be reflected at checkout.
     * @deprecated Use `cost` instead.
     */
    estimatedCost: CartLineEstimatedCost;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The instructions for the line item. */
    instructions: CartLineInstructions;
    /** The merchandise that the buyer intends to purchase. */
    merchandise: Merchandise;
    /** The parent of the line item. */
    parentRelationship?: Maybe<CartLineParentRelationship>;
    /** The quantity of the merchandise that the customer intends to purchase. */
    quantity: Scalars['Int']['output'];
    /** The selling plan associated with the cart line and the effect that each selling plan has on variants when they're purchased. */
    sellingPlanAllocation?: Maybe<SellingPlanAllocation>;
  };

/**
 * An item in a customer's [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart) representing a product variant they intend to purchase. Each cart line tracks the merchandise, quantity, cost breakdown, and any applied discounts.
 *
 * Cart lines can include custom attributes for additional information like gift wrapping requests, and can be associated with a [`SellingPlanAllocation`](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanAllocation) for purchase options like subscriptions, pre-orders, or try-before-you-buy. The [`instructions`](https://shopify.dev/docs/api/storefront/current/objects/CartLine#field-CartLine.fields.instructions) field indicates whether the line can be removed or have its quantity updated.
 *
 */
export type CartLineAttributeArgs = {
  key: Scalars['String']['input'];
};

/**
 * Cost breakdown for a single line item in a [cart](https://shopify.dev/docs/api/storefront/current/objects/Cart). Includes the per-unit price, the subtotal before line-level discounts, and the final total amount the buyer pays.
 *
 * The [`compareAtAmountPerQuantity`](https://shopify.dev/docs/api/storefront/current/objects/CartLineCost#field-CartLineCost.fields.compareAtAmountPerQuantity) field shows the original price when the item is on sale, enabling the display of savings to customers.
 *
 */
export type CartLineCost = {
  __typename?: 'CartLineCost';
  /** The amount of the merchandise line. */
  amountPerQuantity: MoneyV2;
  /** The compare at amount of the merchandise line. */
  compareAtAmountPerQuantity?: Maybe<MoneyV2>;
  /** The cost of the merchandise line before line-level discounts. */
  subtotalAmount: MoneyV2;
  /** The total cost of the merchandise line. */
  totalAmount: MoneyV2;
};

/**
 * The estimated cost of the merchandise line that the buyer will pay at checkout.
 *
 */
export type CartLineEstimatedCost = {
  __typename?: 'CartLineEstimatedCost';
  /** The amount of the merchandise line. */
  amount: MoneyV2;
  /** The compare at amount of the merchandise line. */
  compareAtAmount?: Maybe<MoneyV2>;
  /** The estimated cost of the merchandise line before discounts. */
  subtotalAmount: MoneyV2;
  /** The estimated total cost of the merchandise line. */
  totalAmount: MoneyV2;
};

/**
 * The input fields for adding a merchandise line to a cart. Each line represents a [`ProductVariant`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant) the buyer intends to purchase, along with the quantity and optional [`SellingPlan`](https://shopify.dev/docs/api/storefront/current/objects/SellingPlan) for subscriptions.
 *
 * Used by the [`cartCreate`](https://shopify.dev/docs/api/storefront/current/mutations/cartCreate) mutation when creating a cart with initial items, and the [`cartLinesAdd`](https://shopify.dev/docs/api/storefront/current/mutations/cartLinesAdd) mutation when adding items to an existing cart.
 *
 */
export type CartLineInput = {
  /**
   * An array of key-value pairs that contains additional information about the merchandise line.
   *
   * The input must not contain more than `250` values.
   */
  attributes?: InputMaybe<Array<AttributeInput>>;
  /** The ID of the merchandise that the buyer intends to purchase. */
  merchandiseId: Scalars['ID']['input'];
  /** The parent line item of the cart line. */
  parent?: InputMaybe<CartLineParentInput>;
  /** The quantity of the merchandise. */
  quantity?: InputMaybe<Scalars['Int']['input']>;
  /** The ID of the selling plan that the merchandise is being purchased with. */
  sellingPlanId?: InputMaybe<Scalars['ID']['input']>;
};

/** Represents instructions for a cart line item. */
export type CartLineInstructions = {
  __typename?: 'CartLineInstructions';
  /** Whether the line item can be removed from the cart. */
  canRemove: Scalars['Boolean']['output'];
  /** Whether the line item quantity can be updated. */
  canUpdateQuantity: Scalars['Boolean']['output'];
};

/** The parent line item of the cart line. */
export type CartLineParentInput = {
  /** The id of the parent line item. */
  lineId?: InputMaybe<Scalars['ID']['input']>;
  /** The ID of the parent line merchandise. */
  merchandiseId?: InputMaybe<Scalars['ID']['input']>;
};

/** Represents the parent relationship of a cart line. */
export type CartLineParentRelationship = {
  __typename?: 'CartLineParentRelationship';
  /** The parent cart line. */
  parent: CartLine;
};

/**
 * The input fields for updating a merchandise line in a cart. Used by the [`cartLinesUpdate`](https://shopify.dev/docs/api/storefront/current/mutations/cartLinesUpdate) mutation.
 *
 * Specify the line item's [`id`](https://shopify.dev/docs/api/storefront/current/input-objects/CartLineUpdateInput#fields-id) along with any fields to modify. You can change the quantity, swap the merchandise, update custom attributes, or associate a different selling plan.
 *
 */
export type CartLineUpdateInput = {
  /**
   * An array of key-value pairs that contains additional information about the merchandise line.
   *
   * The input must not contain more than `250` values.
   */
  attributes?: InputMaybe<Array<AttributeInput>>;
  /** The ID of the merchandise line. */
  id: Scalars['ID']['input'];
  /** The ID of the merchandise for the line item. */
  merchandiseId?: InputMaybe<Scalars['ID']['input']>;
  /** The quantity of the line item. */
  quantity?: InputMaybe<Scalars['Int']['input']>;
  /** The ID of the selling plan that the merchandise is being purchased with. */
  sellingPlanId?: InputMaybe<Scalars['ID']['input']>;
};

/** Return type for `cartLinesAdd` mutation. */
export type CartLinesAddPayload = {
  __typename?: 'CartLinesAddPayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/** Return type for `cartLinesRemove` mutation. */
export type CartLinesRemovePayload = {
  __typename?: 'CartLinesRemovePayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/** Return type for `cartLinesUpdate` mutation. */
export type CartLinesUpdatePayload = {
  __typename?: 'CartLinesUpdatePayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/** The input fields to delete a cart metafield. */
export type CartMetafieldDeleteInput = {
  /**
   * The key name of the cart metafield. Can either be a composite key (`namespace.key`) or a simple key
   *  that relies on the default app-reserved namespace.
   *
   */
  key: Scalars['String']['input'];
  /** The ID of the cart resource. */
  ownerId: Scalars['ID']['input'];
};

/** Return type for `cartMetafieldDelete` mutation. */
export type CartMetafieldDeletePayload = {
  __typename?: 'CartMetafieldDeletePayload';
  /** The ID of the deleted cart metafield. */
  deletedId?: Maybe<Scalars['ID']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<MetafieldDeleteUserError>;
};

/** The input fields for a cart metafield value to set. */
export type CartMetafieldsSetInput = {
  /** The key name of the cart metafield. */
  key: Scalars['String']['input'];
  /** The ID of the cart resource. */
  ownerId: Scalars['ID']['input'];
  /**
   * The type of data that the cart metafield stores.
   * The type of data must be a [supported type](https://shopify.dev/apps/metafields/types).
   *
   */
  type: Scalars['String']['input'];
  /**
   * The data to store in the cart metafield. The data is always stored as a string, regardless of the metafield's type.
   *
   */
  value: Scalars['String']['input'];
};

/** Return type for `cartMetafieldsSet` mutation. */
export type CartMetafieldsSetPayload = {
  __typename?: 'CartMetafieldsSetPayload';
  /** The list of cart metafields that were set. */
  metafields?: Maybe<Array<Metafield>>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<MetafieldsSetUserError>;
};

/** Return type for `cartNoteUpdate` mutation. */
export type CartNoteUpdatePayload = {
  __typename?: 'CartNoteUpdatePayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/** An error occurred during the cart operation. */
export type CartOperationError = {
  __typename?: 'CartOperationError';
  /** The error code. */
  code: Scalars['String']['output'];
  /** The error message. */
  message?: Maybe<Scalars['String']['output']>;
};

/**
 * The input fields for updating the payment method that will be used to checkout.
 *
 */
export type CartPaymentInput = {
  /** The amount that the customer will be charged at checkout. */
  amount: MoneyInput;
  /**
   * The input fields to use when checking out a cart with a direct payment method (like a credit card).
   *
   */
  directPaymentMethod?: InputMaybe<CartDirectPaymentMethodInput>;
  /**
   * The input fields to use to checkout a cart without providing a payment method.
   * Use this payment method input if the total cost of the cart is 0.
   *
   */
  freePaymentMethod?: InputMaybe<CartFreePaymentMethodInput>;
  /**
   * An ID of the order placed on the originating platform.
   * Note that this value doesn't correspond to the Shopify Order ID.
   *
   */
  sourceIdentifier?: InputMaybe<Scalars['String']['input']>;
  /**
   * The input fields to use when checking out a cart with a wallet payment method (like Shop Pay or Apple Pay).
   *
   */
  walletPaymentMethod?: InputMaybe<CartWalletPaymentMethodInput>;
};

/** Return type for `cartPaymentUpdate` mutation. */
export type CartPaymentUpdatePayload = {
  __typename?: 'CartPaymentUpdatePayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/**
 * A set of preferences tied to the buyer interacting with the cart. Preferences are used to prefill fields in at checkout to streamline information collection.
 * Preferences are not synced back to the cart if they are overwritten.
 *
 */
export type CartPreferences = {
  __typename?: 'CartPreferences';
  /** Delivery preferences can be used to prefill the delivery section in at checkout. */
  delivery?: Maybe<CartDeliveryPreference>;
  /**
   * Wallet preferences are used to populate relevant payment fields in the checkout flow.
   * Accepted value: `["shop_pay"]`.
   *
   */
  wallet?: Maybe<Array<Scalars['String']['output']>>;
};

/** The input fields represent preferences for the buyer that is interacting with the cart. */
export type CartPreferencesInput = {
  /** Delivery preferences can be used to prefill the delivery section in at checkout. */
  delivery?: InputMaybe<CartDeliveryPreferenceInput>;
  /**
   * Wallet preferences are used to populate relevant payment fields in the checkout flow.
   * Accepted value: `["shop_pay"]`.
   *
   * The input must not contain more than `250` values.
   */
  wallet?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Return type for `cartPrepareForCompletion` mutation. */
export type CartPrepareForCompletionPayload = {
  __typename?: 'CartPrepareForCompletionPayload';
  /** The result of cart preparation for completion. */
  result?: Maybe<CartPrepareForCompletionResult>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
};

/** The result of cart preparation. */
export type CartPrepareForCompletionResult =
  | CartStatusNotReady
  | CartStatusReady
  | CartThrottled;

/** Return type for `cartRemovePersonalData` mutation. */
export type CartRemovePersonalDataPayload = {
  __typename?: 'CartRemovePersonalDataPayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/**
 * A selectable delivery address for a cart.
 *
 */
export type CartSelectableAddress = {
  __typename?: 'CartSelectableAddress';
  /** The delivery address. */
  address: CartAddress;
  /** A unique identifier for the address, specific to this cart. */
  id: Scalars['ID']['output'];
  /** This delivery address will not be associated with the buyer after a successful checkout. */
  oneTimeUse: Scalars['Boolean']['output'];
  /** Sets exactly one address as pre-selected for the buyer. */
  selected: Scalars['Boolean']['output'];
};

/**
 * The input fields for a selectable delivery address to present to the buyer. Used by [`CartDeliveryInput`](https://shopify.dev/docs/api/storefront/current/input-objects/CartDeliveryInput) when creating a cart with the [`cartCreate`](https://shopify.dev/docs/api/storefront/current/mutations/cartCreate) mutation.
 *
 * You can pre-select an address for the buyer, mark it as one-time use so it isn't saved after checkout, and specify how strictly the address should be validated.
 *
 */
export type CartSelectableAddressInput = {
  /** Exactly one kind of delivery address. */
  address: CartAddressInput;
  /** When true, this delivery address will not be associated with the buyer after a successful checkout. */
  oneTimeUse?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sets exactly one address as pre-selected for the buyer. */
  selected?: InputMaybe<Scalars['Boolean']['input']>;
  /** Defines what kind of address validation is requested. */
  validationStrategy?: InputMaybe<DeliveryAddressValidationStrategy>;
};

/** The input fields to update a line item on a cart. */
export type CartSelectableAddressUpdateInput = {
  /** Exactly one kind of delivery address. */
  address?: InputMaybe<CartAddressInput>;
  /** The id of the selectable address. */
  id: Scalars['ID']['input'];
  /** When true, this delivery address will not be associated with the buyer after a successful checkout. */
  oneTimeUse?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sets exactly one address as pre-selected for the buyer. */
  selected?: InputMaybe<Scalars['Boolean']['input']>;
  /** Defines what kind of address validation is requested. */
  validationStrategy?: InputMaybe<DeliveryAddressValidationStrategy>;
};

/**
 * The input fields for updating the selected delivery options for a delivery group.
 *
 */
export type CartSelectedDeliveryOptionInput = {
  /** The ID of the cart delivery group. */
  deliveryGroupId: Scalars['ID']['input'];
  /** The handle of the selected delivery option. */
  deliveryOptionHandle: Scalars['String']['input'];
};

/** Return type for `cartSelectedDeliveryOptionsUpdate` mutation. */
export type CartSelectedDeliveryOptionsUpdatePayload = {
  __typename?: 'CartSelectedDeliveryOptionsUpdatePayload';
  /** The updated cart. */
  cart?: Maybe<Cart>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
  /** A list of warnings that occurred during the mutation. */
  warnings: Array<CartWarning>;
};

/** Cart is not ready for payment update and completion. */
export type CartStatusNotReady = {
  __typename?: 'CartStatusNotReady';
  /** The result of cart preparation for completion. */
  cart?: Maybe<Cart>;
  /** The list of errors that caused the cart to not be ready for payment update and completion. */
  errors: Array<CartOperationError>;
};

/** Cart is ready for payment update and completion. */
export type CartStatusReady = {
  __typename?: 'CartStatusReady';
  /** The result of cart preparation for completion. */
  cart?: Maybe<Cart>;
};

/** Return type for `cartSubmitForCompletion` mutation. */
export type CartSubmitForCompletionPayload = {
  __typename?: 'CartSubmitForCompletionPayload';
  /** The result of cart submission for completion. */
  result?: Maybe<CartSubmitForCompletionResult>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<CartUserError>;
};

/** The result of cart submit completion. */
export type CartSubmitForCompletionResult =
  | SubmitAlreadyAccepted
  | SubmitFailed
  | SubmitSuccess
  | SubmitThrottled;

/**
 * Response signifying that the access to cart request is currently being throttled.
 * The client can retry after `poll_after`.
 *
 */
export type CartThrottled = {
  __typename?: 'CartThrottled';
  /** The result of cart preparation for completion. */
  cart?: Maybe<Cart>;
  /** The polling delay. */
  pollAfter: Scalars['DateTime']['output'];
};

/** Represents an error that happens during execution of a cart mutation. */
export type CartUserError = DisplayableError & {
  __typename?: 'CartUserError';
  /** The error code. */
  code?: Maybe<CartErrorCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/**
 * The input fields for submitting wallet payment method information for checkout.
 *
 */
export type CartWalletPaymentMethodInput = {
  /** The payment method information for the Apple Pay wallet. */
  applePayWalletContent?: InputMaybe<ApplePayWalletContentInput>;
  /** The payment method information for the Shop Pay wallet. */
  shopPayWalletContent?: InputMaybe<ShopPayWalletContentInput>;
};

/**
 * A non-blocking issue that occurred during a cart mutation. Unlike errors, warnings don't prevent the mutation from completing but indicate potential problems that may affect the buyer's experience.
 *
 * Each warning includes a code identifying the issue type, a human-readable message, and a target ID pointing to the affected resource.
 *
 */
export type CartWarning = {
  __typename?: 'CartWarning';
  /** The code of the warning. */
  code: CartWarningCode;
  /** The message text of the warning. */
  message: Scalars['String']['output'];
  /** The target of the warning. */
  target: Scalars['ID']['output'];
};

/** The code for the cart warning. */
export type CartWarningCode =
  /** The discount code cannot be honored. */
  | 'DISCOUNT_CODE_NOT_HONOURED'
  /** The discount is currently inactive. */
  | 'DISCOUNT_CURRENTLY_INACTIVE'
  /** The customer is not eligible for this discount. */
  | 'DISCOUNT_CUSTOMER_NOT_ELIGIBLE'
  /** The customer's discount usage limit has been reached. */
  | 'DISCOUNT_CUSTOMER_USAGE_LIMIT_REACHED'
  /** An eligible customer is missing for this discount. */
  | 'DISCOUNT_ELIGIBLE_CUSTOMER_MISSING'
  /** The purchase type is incompatible with this discount. */
  | 'DISCOUNT_INCOMPATIBLE_PURCHASE_TYPE'
  /** The discount was not found. */
  | 'DISCOUNT_NOT_FOUND'
  /** There are no entitled line items for this discount. */
  | 'DISCOUNT_NO_ENTITLED_LINE_ITEMS'
  /** There are no entitled shipping lines for this discount. */
  | 'DISCOUNT_NO_ENTITLED_SHIPPING_LINES'
  /** The purchase is not in range for this discount. */
  | 'DISCOUNT_PURCHASE_NOT_IN_RANGE'
  /** The quantity is not in range for this discount. */
  | 'DISCOUNT_QUANTITY_NOT_IN_RANGE'
  /** The discount usage limit has been reached. */
  | 'DISCOUNT_USAGE_LIMIT_REACHED'
  /** A delivery address with the same details already exists on this cart. */
  | 'DUPLICATE_DELIVERY_ADDRESS'
  /** The merchandise does not have enough stock. */
  | 'MERCHANDISE_NOT_ENOUGH_STOCK'
  /** The merchandise is out of stock. */
  | 'MERCHANDISE_OUT_OF_STOCK'
  /** Only one-time purchase is available for B2B orders. */
  | 'MERCHANDISE_SELLING_PLAN_NOT_APPLICABLE_ON_COMPANY_LOCATION'
  /** Gift cards are not available as a payment method. */
  | 'PAYMENTS_GIFT_CARDS_UNAVAILABLE';

/**
 * A filter used to view a subset of products in a collection matching a specific category value.
 *
 */
export type CategoryFilter = {
  /** The id of the category to filter on. */
  id: Scalars['String']['input'];
};

/**
 * A group of products [organized by a merchant](https://help.shopify.com/manual/products/collections) to make their store easier to browse. Collections can help customers discover related products by category, season, promotion, or other criteria.
 *
 * Query a collection's products with [filtering options](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/filter-products) like availability, price range, vendor, and tags. Each collection includes [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) information, an optional [`Image`](https://shopify.dev/docs/api/storefront/current/objects/Image), and supports custom data through [`metafields`](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 */
export type Collection = HasMetafields &
  Node &
  OnlineStorePublishable &
  Trackable & {
    __typename?: 'Collection';
    /** Stripped description of the collection, single line with HTML tags removed. */
    description: Scalars['String']['output'];
    /** The description of the collection, complete with HTML formatting. */
    descriptionHtml: Scalars['HTML']['output'];
    /**
     * A human-friendly unique string for the collection automatically generated from its title.
     * Limit of 255 characters.
     *
     */
    handle: Scalars['String']['output'];
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** Image associated with the collection. */
    image?: Maybe<Image>;
    /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
    metafield?: Maybe<Metafield>;
    /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
    metafields: Array<Maybe<Metafield>>;
    /** The URL used for viewing the resource on the shop's Online Store. Returns `null` if the resource is currently not published to the Online Store sales channel. */
    onlineStoreUrl?: Maybe<Scalars['URL']['output']>;
    /** List of products in the collection. */
    products: ProductConnection;
    /** The collection's SEO information. */
    seo: Seo;
    /** The collection’s name. Limit of 255 characters. */
    title: Scalars['String']['output'];
    /** URL parameters to be added to a page URL to track the origin of on-site search traffic for [analytics reporting](https://help.shopify.com/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports). Returns a result when accessed through the [search](https://shopify.dev/docs/api/storefront/current/queries/search) or [predictiveSearch](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries, otherwise returns null. */
    trackingParameters?: Maybe<Scalars['String']['output']>;
    /** The date and time when the collection was last modified. */
    updatedAt: Scalars['DateTime']['output'];
  };

/**
 * A group of products [organized by a merchant](https://help.shopify.com/manual/products/collections) to make their store easier to browse. Collections can help customers discover related products by category, season, promotion, or other criteria.
 *
 * Query a collection's products with [filtering options](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/filter-products) like availability, price range, vendor, and tags. Each collection includes [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) information, an optional [`Image`](https://shopify.dev/docs/api/storefront/current/objects/Image), and supports custom data through [`metafields`](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 */
export type CollectionDescriptionArgs = {
  truncateAt?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * A group of products [organized by a merchant](https://help.shopify.com/manual/products/collections) to make their store easier to browse. Collections can help customers discover related products by category, season, promotion, or other criteria.
 *
 * Query a collection's products with [filtering options](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/filter-products) like availability, price range, vendor, and tags. Each collection includes [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) information, an optional [`Image`](https://shopify.dev/docs/api/storefront/current/objects/Image), and supports custom data through [`metafields`](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 */
export type CollectionMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * A group of products [organized by a merchant](https://help.shopify.com/manual/products/collections) to make their store easier to browse. Collections can help customers discover related products by category, season, promotion, or other criteria.
 *
 * Query a collection's products with [filtering options](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/filter-products) like availability, price range, vendor, and tags. Each collection includes [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) information, an optional [`Image`](https://shopify.dev/docs/api/storefront/current/objects/Image), and supports custom data through [`metafields`](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 */
export type CollectionMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/**
 * A group of products [organized by a merchant](https://help.shopify.com/manual/products/collections) to make their store easier to browse. Collections can help customers discover related products by category, season, promotion, or other criteria.
 *
 * Query a collection's products with [filtering options](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/filter-products) like availability, price range, vendor, and tags. Each collection includes [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) information, an optional [`Image`](https://shopify.dev/docs/api/storefront/current/objects/Image), and supports custom data through [`metafields`](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 */
export type CollectionProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filters?: InputMaybe<Array<ProductFilter>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<ProductCollectionSortKeys>;
};

/**
 * An auto-generated type for paginating through multiple Collections.
 *
 */
export type CollectionConnection = {
  __typename?: 'CollectionConnection';
  /** A list of edges. */
  edges: Array<CollectionEdge>;
  /** A list of the nodes contained in CollectionEdge. */
  nodes: Array<Collection>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total count of Collections. */
  totalCount: Scalars['UnsignedInt64']['output'];
};

/**
 * An auto-generated type which holds one Collection and a cursor during pagination.
 *
 */
export type CollectionEdge = {
  __typename?: 'CollectionEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of CollectionEdge. */
  node: Collection;
};

/** The set of valid sort keys for the Collection query. */
export type CollectionSortKeys =
  /** Sort by the `id` value. */
  | 'ID'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `title` value. */
  | 'TITLE'
  /** Sort by the `updated_at` value. */
  | 'UPDATED_AT';

/** A comment on an article. */
export type Comment = Node & {
  __typename?: 'Comment';
  /** The comment’s author. */
  author: CommentAuthor;
  /** Stripped content of the comment, single line with HTML tags removed. */
  content: Scalars['String']['output'];
  /** The content of the comment, complete with HTML formatting. */
  contentHtml: Scalars['HTML']['output'];
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
};

/** A comment on an article. */
export type CommentContentArgs = {
  truncateAt?: InputMaybe<Scalars['Int']['input']>;
};

/** The author of a comment. */
export type CommentAuthor = {
  __typename?: 'CommentAuthor';
  /** The author's email. */
  email: Scalars['String']['output'];
  /** The author’s name. */
  name: Scalars['String']['output'];
};

/**
 * An auto-generated type for paginating through multiple Comments.
 *
 */
export type CommentConnection = {
  __typename?: 'CommentConnection';
  /** A list of edges. */
  edges: Array<CommentEdge>;
  /** A list of the nodes contained in CommentEdge. */
  nodes: Array<Comment>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one Comment and a cursor during pagination.
 *
 */
export type CommentEdge = {
  __typename?: 'CommentEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of CommentEdge. */
  node: Comment;
};

/**
 * A B2B organization that purchases from the shop. In the Storefront API, company information is accessed through the [`PurchasingCompany`](https://shopify.dev/docs/api/storefront/current/objects/PurchasingCompany) object on [`CartBuyerIdentity`](https://shopify.dev/docs/api/storefront/current/objects/CartBuyerIdentity), which provides the associated location and contact for the current purchasing context.
 *
 * You can store custom data using [metafields](https://shopify.dev/docs/apps/build/metafields).
 *
 */
export type Company = HasMetafields &
  Node & {
    __typename?: 'Company';
    /** The date and time ([ISO 8601 format](http://en.wikipedia.org/wiki/ISO_8601)) at which the company was created in Shopify. */
    createdAt: Scalars['DateTime']['output'];
    /** A unique externally-supplied ID for the company. */
    externalId?: Maybe<Scalars['String']['output']>;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
    metafield?: Maybe<Metafield>;
    /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
    metafields: Array<Maybe<Metafield>>;
    /** The name of the company. */
    name: Scalars['String']['output'];
    /** The date and time ([ISO 8601 format](http://en.wikipedia.org/wiki/ISO_8601)) at which the company was last modified. */
    updatedAt: Scalars['DateTime']['output'];
  };

/**
 * A B2B organization that purchases from the shop. In the Storefront API, company information is accessed through the [`PurchasingCompany`](https://shopify.dev/docs/api/storefront/current/objects/PurchasingCompany) object on [`CartBuyerIdentity`](https://shopify.dev/docs/api/storefront/current/objects/CartBuyerIdentity), which provides the associated location and contact for the current purchasing context.
 *
 * You can store custom data using [metafields](https://shopify.dev/docs/apps/build/metafields).
 *
 */
export type CompanyMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * A B2B organization that purchases from the shop. In the Storefront API, company information is accessed through the [`PurchasingCompany`](https://shopify.dev/docs/api/storefront/current/objects/PurchasingCompany) object on [`CartBuyerIdentity`](https://shopify.dev/docs/api/storefront/current/objects/CartBuyerIdentity), which provides the associated location and contact for the current purchasing context.
 *
 * You can store custom data using [metafields](https://shopify.dev/docs/apps/build/metafields).
 *
 */
export type CompanyMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/** A company's main point of contact. */
export type CompanyContact = Node & {
  __typename?: 'CompanyContact';
  /** The date and time ([ISO 8601 format](http://en.wikipedia.org/wiki/ISO_8601)) at which the company contact was created in Shopify. */
  createdAt: Scalars['DateTime']['output'];
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The company contact's locale (language). */
  locale?: Maybe<Scalars['String']['output']>;
  /** The company contact's job title. */
  title?: Maybe<Scalars['String']['output']>;
  /** The date and time ([ISO 8601 format](http://en.wikipedia.org/wiki/ISO_8601)) at which the company contact was last modified. */
  updatedAt: Scalars['DateTime']['output'];
};

/**
 * A branch or office of a [`Company`](https://shopify.dev/docs/api/storefront/current/objects/Company) where B2B customers can place orders. When a B2B customer selects a location after logging in, the Storefront API contextualizes product queries to return location-specific pricing and quantity rules.
 *
 * Access through the [`PurchasingCompany`](https://shopify.dev/docs/api/storefront/current/objects/PurchasingCompany) object, which associates the location with the buyer's [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart).
 *
 */
export type CompanyLocation = HasMetafields &
  Node & {
    __typename?: 'CompanyLocation';
    /** The date and time ([ISO 8601 format](http://en.wikipedia.org/wiki/ISO_8601)) at which the company location was created in Shopify. */
    createdAt: Scalars['DateTime']['output'];
    /** A unique externally-supplied ID for the company. */
    externalId?: Maybe<Scalars['String']['output']>;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The preferred locale of the company location. */
    locale?: Maybe<Scalars['String']['output']>;
    /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
    metafield?: Maybe<Metafield>;
    /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
    metafields: Array<Maybe<Metafield>>;
    /** The name of the company location. */
    name: Scalars['String']['output'];
    /** The date and time ([ISO 8601 format](http://en.wikipedia.org/wiki/ISO_8601)) at which the company location was last modified. */
    updatedAt: Scalars['DateTime']['output'];
  };

/**
 * A branch or office of a [`Company`](https://shopify.dev/docs/api/storefront/current/objects/Company) where B2B customers can place orders. When a B2B customer selects a location after logging in, the Storefront API contextualizes product queries to return location-specific pricing and quantity rules.
 *
 * Access through the [`PurchasingCompany`](https://shopify.dev/docs/api/storefront/current/objects/PurchasingCompany) object, which associates the location with the buyer's [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart).
 *
 */
export type CompanyLocationMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * A branch or office of a [`Company`](https://shopify.dev/docs/api/storefront/current/objects/Company) where B2B customers can place orders. When a B2B customer selects a location after logging in, the Storefront API contextualizes product queries to return location-specific pricing and quantity rules.
 *
 * Access through the [`PurchasingCompany`](https://shopify.dev/docs/api/storefront/current/objects/PurchasingCompany) object, which associates the location with the buyer's [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart).
 *
 */
export type CompanyLocationMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/** The action for the 3DS payment redirect. */
export type CompletePaymentChallenge = {
  __typename?: 'CompletePaymentChallenge';
  /** The URL for the 3DS payment redirect. */
  redirectUrl?: Maybe<Scalars['URL']['output']>;
};

/** An error that occurred during a cart completion attempt. */
export type CompletionError = {
  __typename?: 'CompletionError';
  /** The error code. */
  code: CompletionErrorCode;
  /** The error message. */
  message?: Maybe<Scalars['String']['output']>;
};

/** The code of the error that occurred during a cart completion attempt. */
export type CompletionErrorCode =
  | 'ERROR'
  | 'INVENTORY_RESERVATION_ERROR'
  | 'PAYMENT_AMOUNT_TOO_SMALL'
  | 'PAYMENT_CALL_ISSUER'
  | 'PAYMENT_CARD_DECLINED'
  | 'PAYMENT_ERROR'
  | 'PAYMENT_GATEWAY_NOT_ENABLED_ERROR'
  | 'PAYMENT_INSUFFICIENT_FUNDS'
  | 'PAYMENT_INVALID_BILLING_ADDRESS'
  | 'PAYMENT_INVALID_CREDIT_CARD'
  | 'PAYMENT_INVALID_CURRENCY'
  | 'PAYMENT_INVALID_PAYMENT_METHOD'
  | 'PAYMENT_TRANSIENT_ERROR';

/** Represents information about the grouped merchandise in the cart. */
export type ComponentizableCartLine = BaseCartLine &
  Node & {
    __typename?: 'ComponentizableCartLine';
    /** An attribute associated with the cart line. */
    attribute?: Maybe<Attribute>;
    /** The attributes associated with the cart line. Attributes are represented as key-value pairs. */
    attributes: Array<Attribute>;
    /** The cost of the merchandise that the buyer will pay for at checkout. The costs are subject to change and changes will be reflected at checkout. */
    cost: CartLineCost;
    /** The discounts that have been applied to the cart line. */
    discountAllocations: Array<
      | CartAutomaticDiscountAllocation
      | CartCodeDiscountAllocation
      | CartCustomDiscountAllocation
    >;
    /**
     * The estimated cost of the merchandise that the buyer will pay for at checkout. The estimated costs are subject to change and changes will be reflected at checkout.
     * @deprecated Use `cost` instead.
     */
    estimatedCost: CartLineEstimatedCost;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The components of the line item. */
    lineComponents: Array<CartLine>;
    /** The merchandise that the buyer intends to purchase. */
    merchandise: Merchandise;
    /** The quantity of the merchandise that the customer intends to purchase. */
    quantity: Scalars['Int']['output'];
    /** The selling plan associated with the cart line and the effect that each selling plan has on variants when they're purchased. */
    sellingPlanAllocation?: Maybe<SellingPlanAllocation>;
  };

/** Represents information about the grouped merchandise in the cart. */
export type ComponentizableCartLineAttributeArgs = {
  key: Scalars['String']['input'];
};

/** Details for count of elements. */
export type Count = {
  __typename?: 'Count';
  /** Count of elements. */
  count: Scalars['Int']['output'];
  /** Precision of count, how exact is the value. */
  precision: CountPrecision;
};

/** The precision of the value returned by a count field. */
export type CountPrecision =
  /** The count is at least the value. A limit was reached. */
  | 'AT_LEAST'
  /** The count is exactly the value. */
  | 'EXACT';

/**
 * A country with localization settings for a storefront. Includes the country's currency, available languages, default language, and unit system (metric or imperial).
 *
 * Access countries through the [localization](https://shopify.dev/docs/api/storefront/current/queries/localization) query, which returns both the list of available countries and the currently active country. Use the [`@inContext`](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/in-context) directive to change the active country context.
 *
 */
export type Country = {
  __typename?: 'Country';
  /** The languages available for the country. */
  availableLanguages: Array<Language>;
  /** The currency of the country. */
  currency: Currency;
  /** The default language for the country. */
  defaultLanguage: Language;
  /** The ISO code of the country. */
  isoCode: CountryCode;
  /**
   * The market that includes this country.
   * @deprecated This `market` field will be removed in a future version of the API.
   */
  market?: Maybe<Market>;
  /** The name of the country. */
  name: Scalars['String']['output'];
  /** The unit system used in the country. */
  unitSystem: UnitSystem;
};

/**
 * The code designating a country/region, which generally follows ISO 3166-1 alpha-2 guidelines.
 * If a territory doesn't have a country code value in the `CountryCode` enum, then it might be considered a subdivision
 * of another country. For example, the territories associated with Spain are represented by the country code `ES`,
 * and the territories associated with the United States of America are represented by the country code `US`.
 *
 */
export type CountryCode =
  /** Ascension Island. */
  | 'AC'
  /** Andorra. */
  | 'AD'
  /** United Arab Emirates. */
  | 'AE'
  /** Afghanistan. */
  | 'AF'
  /** Antigua & Barbuda. */
  | 'AG'
  /** Anguilla. */
  | 'AI'
  /** Albania. */
  | 'AL'
  /** Armenia. */
  | 'AM'
  /** Netherlands Antilles. */
  | 'AN'
  /** Angola. */
  | 'AO'
  /** Argentina. */
  | 'AR'
  /** Austria. */
  | 'AT'
  /** Australia. */
  | 'AU'
  /** Aruba. */
  | 'AW'
  /** Åland Islands. */
  | 'AX'
  /** Azerbaijan. */
  | 'AZ'
  /** Bosnia & Herzegovina. */
  | 'BA'
  /** Barbados. */
  | 'BB'
  /** Bangladesh. */
  | 'BD'
  /** Belgium. */
  | 'BE'
  /** Burkina Faso. */
  | 'BF'
  /** Bulgaria. */
  | 'BG'
  /** Bahrain. */
  | 'BH'
  /** Burundi. */
  | 'BI'
  /** Benin. */
  | 'BJ'
  /** St. Barthélemy. */
  | 'BL'
  /** Bermuda. */
  | 'BM'
  /** Brunei. */
  | 'BN'
  /** Bolivia. */
  | 'BO'
  /** Caribbean Netherlands. */
  | 'BQ'
  /** Brazil. */
  | 'BR'
  /** Bahamas. */
  | 'BS'
  /** Bhutan. */
  | 'BT'
  /** Bouvet Island. */
  | 'BV'
  /** Botswana. */
  | 'BW'
  /** Belarus. */
  | 'BY'
  /** Belize. */
  | 'BZ'
  /** Canada. */
  | 'CA'
  /** Cocos (Keeling) Islands. */
  | 'CC'
  /** Congo - Kinshasa. */
  | 'CD'
  /** Central African Republic. */
  | 'CF'
  /** Congo - Brazzaville. */
  | 'CG'
  /** Switzerland. */
  | 'CH'
  /** Côte d’Ivoire. */
  | 'CI'
  /** Cook Islands. */
  | 'CK'
  /** Chile. */
  | 'CL'
  /** Cameroon. */
  | 'CM'
  /** China. */
  | 'CN'
  /** Colombia. */
  | 'CO'
  /** Costa Rica. */
  | 'CR'
  /** Cuba. */
  | 'CU'
  /** Cape Verde. */
  | 'CV'
  /** Curaçao. */
  | 'CW'
  /** Christmas Island. */
  | 'CX'
  /** Cyprus. */
  | 'CY'
  /** Czechia. */
  | 'CZ'
  /** Germany. */
  | 'DE'
  /** Djibouti. */
  | 'DJ'
  /** Denmark. */
  | 'DK'
  /** Dominica. */
  | 'DM'
  /** Dominican Republic. */
  | 'DO'
  /** Algeria. */
  | 'DZ'
  /** Ecuador. */
  | 'EC'
  /** Estonia. */
  | 'EE'
  /** Egypt. */
  | 'EG'
  /** Western Sahara. */
  | 'EH'
  /** Eritrea. */
  | 'ER'
  /** Spain. */
  | 'ES'
  /** Ethiopia. */
  | 'ET'
  /** Finland. */
  | 'FI'
  /** Fiji. */
  | 'FJ'
  /** Falkland Islands. */
  | 'FK'
  /** Faroe Islands. */
  | 'FO'
  /** France. */
  | 'FR'
  /** Gabon. */
  | 'GA'
  /** United Kingdom. */
  | 'GB'
  /** Grenada. */
  | 'GD'
  /** Georgia. */
  | 'GE'
  /** French Guiana. */
  | 'GF'
  /** Guernsey. */
  | 'GG'
  /** Ghana. */
  | 'GH'
  /** Gibraltar. */
  | 'GI'
  /** Greenland. */
  | 'GL'
  /** Gambia. */
  | 'GM'
  /** Guinea. */
  | 'GN'
  /** Guadeloupe. */
  | 'GP'
  /** Equatorial Guinea. */
  | 'GQ'
  /** Greece. */
  | 'GR'
  /** South Georgia & South Sandwich Islands. */
  | 'GS'
  /** Guatemala. */
  | 'GT'
  /** Guinea-Bissau. */
  | 'GW'
  /** Guyana. */
  | 'GY'
  /** Hong Kong SAR. */
  | 'HK'
  /** Heard & McDonald Islands. */
  | 'HM'
  /** Honduras. */
  | 'HN'
  /** Croatia. */
  | 'HR'
  /** Haiti. */
  | 'HT'
  /** Hungary. */
  | 'HU'
  /** Indonesia. */
  | 'ID'
  /** Ireland. */
  | 'IE'
  /** Israel. */
  | 'IL'
  /** Isle of Man. */
  | 'IM'
  /** India. */
  | 'IN'
  /** British Indian Ocean Territory. */
  | 'IO'
  /** Iraq. */
  | 'IQ'
  /** Iran. */
  | 'IR'
  /** Iceland. */
  | 'IS'
  /** Italy. */
  | 'IT'
  /** Jersey. */
  | 'JE'
  /** Jamaica. */
  | 'JM'
  /** Jordan. */
  | 'JO'
  /** Japan. */
  | 'JP'
  /** Kenya. */
  | 'KE'
  /** Kyrgyzstan. */
  | 'KG'
  /** Cambodia. */
  | 'KH'
  /** Kiribati. */
  | 'KI'
  /** Comoros. */
  | 'KM'
  /** St. Kitts & Nevis. */
  | 'KN'
  /** North Korea. */
  | 'KP'
  /** South Korea. */
  | 'KR'
  /** Kuwait. */
  | 'KW'
  /** Cayman Islands. */
  | 'KY'
  /** Kazakhstan. */
  | 'KZ'
  /** Laos. */
  | 'LA'
  /** Lebanon. */
  | 'LB'
  /** St. Lucia. */
  | 'LC'
  /** Liechtenstein. */
  | 'LI'
  /** Sri Lanka. */
  | 'LK'
  /** Liberia. */
  | 'LR'
  /** Lesotho. */
  | 'LS'
  /** Lithuania. */
  | 'LT'
  /** Luxembourg. */
  | 'LU'
  /** Latvia. */
  | 'LV'
  /** Libya. */
  | 'LY'
  /** Morocco. */
  | 'MA'
  /** Monaco. */
  | 'MC'
  /** Moldova. */
  | 'MD'
  /** Montenegro. */
  | 'ME'
  /** St. Martin. */
  | 'MF'
  /** Madagascar. */
  | 'MG'
  /** North Macedonia. */
  | 'MK'
  /** Mali. */
  | 'ML'
  /** Myanmar (Burma). */
  | 'MM'
  /** Mongolia. */
  | 'MN'
  /** Macao SAR. */
  | 'MO'
  /** Martinique. */
  | 'MQ'
  /** Mauritania. */
  | 'MR'
  /** Montserrat. */
  | 'MS'
  /** Malta. */
  | 'MT'
  /** Mauritius. */
  | 'MU'
  /** Maldives. */
  | 'MV'
  /** Malawi. */
  | 'MW'
  /** Mexico. */
  | 'MX'
  /** Malaysia. */
  | 'MY'
  /** Mozambique. */
  | 'MZ'
  /** Namibia. */
  | 'NA'
  /** New Caledonia. */
  | 'NC'
  /** Niger. */
  | 'NE'
  /** Norfolk Island. */
  | 'NF'
  /** Nigeria. */
  | 'NG'
  /** Nicaragua. */
  | 'NI'
  /** Netherlands. */
  | 'NL'
  /** Norway. */
  | 'NO'
  /** Nepal. */
  | 'NP'
  /** Nauru. */
  | 'NR'
  /** Niue. */
  | 'NU'
  /** New Zealand. */
  | 'NZ'
  /** Oman. */
  | 'OM'
  /** Panama. */
  | 'PA'
  /** Peru. */
  | 'PE'
  /** French Polynesia. */
  | 'PF'
  /** Papua New Guinea. */
  | 'PG'
  /** Philippines. */
  | 'PH'
  /** Pakistan. */
  | 'PK'
  /** Poland. */
  | 'PL'
  /** St. Pierre & Miquelon. */
  | 'PM'
  /** Pitcairn Islands. */
  | 'PN'
  /** Palestinian Territories. */
  | 'PS'
  /** Portugal. */
  | 'PT'
  /** Paraguay. */
  | 'PY'
  /** Qatar. */
  | 'QA'
  /** Réunion. */
  | 'RE'
  /** Romania. */
  | 'RO'
  /** Serbia. */
  | 'RS'
  /** Russia. */
  | 'RU'
  /** Rwanda. */
  | 'RW'
  /** Saudi Arabia. */
  | 'SA'
  /** Solomon Islands. */
  | 'SB'
  /** Seychelles. */
  | 'SC'
  /** Sudan. */
  | 'SD'
  /** Sweden. */
  | 'SE'
  /** Singapore. */
  | 'SG'
  /** St. Helena. */
  | 'SH'
  /** Slovenia. */
  | 'SI'
  /** Svalbard & Jan Mayen. */
  | 'SJ'
  /** Slovakia. */
  | 'SK'
  /** Sierra Leone. */
  | 'SL'
  /** San Marino. */
  | 'SM'
  /** Senegal. */
  | 'SN'
  /** Somalia. */
  | 'SO'
  /** Suriname. */
  | 'SR'
  /** South Sudan. */
  | 'SS'
  /** São Tomé & Príncipe. */
  | 'ST'
  /** El Salvador. */
  | 'SV'
  /** Sint Maarten. */
  | 'SX'
  /** Syria. */
  | 'SY'
  /** Eswatini. */
  | 'SZ'
  /** Tristan da Cunha. */
  | 'TA'
  /** Turks & Caicos Islands. */
  | 'TC'
  /** Chad. */
  | 'TD'
  /** French Southern Territories. */
  | 'TF'
  /** Togo. */
  | 'TG'
  /** Thailand. */
  | 'TH'
  /** Tajikistan. */
  | 'TJ'
  /** Tokelau. */
  | 'TK'
  /** Timor-Leste. */
  | 'TL'
  /** Turkmenistan. */
  | 'TM'
  /** Tunisia. */
  | 'TN'
  /** Tonga. */
  | 'TO'
  /** Türkiye. */
  | 'TR'
  /** Trinidad & Tobago. */
  | 'TT'
  /** Tuvalu. */
  | 'TV'
  /** Taiwan. */
  | 'TW'
  /** Tanzania. */
  | 'TZ'
  /** Ukraine. */
  | 'UA'
  /** Uganda. */
  | 'UG'
  /** U.S. Outlying Islands. */
  | 'UM'
  /** United States. */
  | 'US'
  /** Uruguay. */
  | 'UY'
  /** Uzbekistan. */
  | 'UZ'
  /** Vatican City. */
  | 'VA'
  /** St. Vincent & Grenadines. */
  | 'VC'
  /** Venezuela. */
  | 'VE'
  /** British Virgin Islands. */
  | 'VG'
  /** Vietnam. */
  | 'VN'
  /** Vanuatu. */
  | 'VU'
  /** Wallis & Futuna. */
  | 'WF'
  /** Samoa. */
  | 'WS'
  /** Kosovo. */
  | 'XK'
  /** Yemen. */
  | 'YE'
  /** Mayotte. */
  | 'YT'
  /** South Africa. */
  | 'ZA'
  /** Zambia. */
  | 'ZM'
  /** Zimbabwe. */
  | 'ZW'
  /** Unknown Region. */
  | 'ZZ';

/** The part of the image that should remain after cropping. */
export type CropRegion =
  /** Keep the bottom of the image. */
  | 'BOTTOM'
  /** Keep the center of the image. */
  | 'CENTER'
  /** Keep the left of the image. */
  | 'LEFT'
  /** Keep the right of the image. */
  | 'RIGHT'
  /** Keep the top of the image. */
  | 'TOP';

/** A currency. */
export type Currency = {
  __typename?: 'Currency';
  /** The ISO code of the currency. */
  isoCode: CurrencyCode;
  /** The name of the currency. */
  name: Scalars['String']['output'];
  /** The symbol of the currency. */
  symbol: Scalars['String']['output'];
};

/**
 * The three-letter currency codes that represent the world currencies used in
 * stores. These include standard ISO 4217 codes, legacy codes,
 * and non-standard codes.
 *
 */
export type CurrencyCode =
  /** United Arab Emirates Dirham (AED). */
  | 'AED'
  /** Afghan Afghani (AFN). */
  | 'AFN'
  /** Albanian Lek (ALL). */
  | 'ALL'
  /** Armenian Dram (AMD). */
  | 'AMD'
  /** Netherlands Antillean Guilder. */
  | 'ANG'
  /** Angolan Kwanza (AOA). */
  | 'AOA'
  /** Argentine Pesos (ARS). */
  | 'ARS'
  /** Australian Dollars (AUD). */
  | 'AUD'
  /** Aruban Florin (AWG). */
  | 'AWG'
  /** Azerbaijani Manat (AZN). */
  | 'AZN'
  /** Bosnia and Herzegovina Convertible Mark (BAM). */
  | 'BAM'
  /** Barbadian Dollar (BBD). */
  | 'BBD'
  /** Bangladesh Taka (BDT). */
  | 'BDT'
  /** Bulgarian Lev (BGN). */
  | 'BGN'
  /** Bahraini Dinar (BHD). */
  | 'BHD'
  /** Burundian Franc (BIF). */
  | 'BIF'
  /** Bermudian Dollar (BMD). */
  | 'BMD'
  /** Brunei Dollar (BND). */
  | 'BND'
  /** Bolivian Boliviano (BOB). */
  | 'BOB'
  /** Brazilian Real (BRL). */
  | 'BRL'
  /** Bahamian Dollar (BSD). */
  | 'BSD'
  /** Bhutanese Ngultrum (BTN). */
  | 'BTN'
  /** Botswana Pula (BWP). */
  | 'BWP'
  /** Belarusian Ruble (BYN). */
  | 'BYN'
  /** Belarusian Ruble (BYR). */
  | 'BYR'
  /** Belize Dollar (BZD). */
  | 'BZD'
  /** Canadian Dollars (CAD). */
  | 'CAD'
  /** Congolese franc (CDF). */
  | 'CDF'
  /** Swiss Francs (CHF). */
  | 'CHF'
  /** Chilean Peso (CLP). */
  | 'CLP'
  /** Chinese Yuan Renminbi (CNY). */
  | 'CNY'
  /** Colombian Peso (COP). */
  | 'COP'
  /** Costa Rican Colones (CRC). */
  | 'CRC'
  /** Cape Verdean escudo (CVE). */
  | 'CVE'
  /** Czech Koruny (CZK). */
  | 'CZK'
  /** Djiboutian Franc (DJF). */
  | 'DJF'
  /** Danish Kroner (DKK). */
  | 'DKK'
  /** Dominican Peso (DOP). */
  | 'DOP'
  /** Algerian Dinar (DZD). */
  | 'DZD'
  /** Egyptian Pound (EGP). */
  | 'EGP'
  /** Eritrean Nakfa (ERN). */
  | 'ERN'
  /** Ethiopian Birr (ETB). */
  | 'ETB'
  /** Euro (EUR). */
  | 'EUR'
  /** Fijian Dollars (FJD). */
  | 'FJD'
  /** Falkland Islands Pounds (FKP). */
  | 'FKP'
  /** United Kingdom Pounds (GBP). */
  | 'GBP'
  /** Georgian Lari (GEL). */
  | 'GEL'
  /** Ghanaian Cedi (GHS). */
  | 'GHS'
  /** Gibraltar Pounds (GIP). */
  | 'GIP'
  /** Gambian Dalasi (GMD). */
  | 'GMD'
  /** Guinean Franc (GNF). */
  | 'GNF'
  /** Guatemalan Quetzal (GTQ). */
  | 'GTQ'
  /** Guyanese Dollar (GYD). */
  | 'GYD'
  /** Hong Kong Dollars (HKD). */
  | 'HKD'
  /** Honduran Lempira (HNL). */
  | 'HNL'
  /** Croatian Kuna (HRK). */
  | 'HRK'
  /** Haitian Gourde (HTG). */
  | 'HTG'
  /** Hungarian Forint (HUF). */
  | 'HUF'
  /** Indonesian Rupiah (IDR). */
  | 'IDR'
  /** Israeli New Shekel (NIS). */
  | 'ILS'
  /** Indian Rupees (INR). */
  | 'INR'
  /** Iraqi Dinar (IQD). */
  | 'IQD'
  /** Iranian Rial (IRR). */
  | 'IRR'
  /** Icelandic Kronur (ISK). */
  | 'ISK'
  /** Jersey Pound. */
  | 'JEP'
  /** Jamaican Dollars (JMD). */
  | 'JMD'
  /** Jordanian Dinar (JOD). */
  | 'JOD'
  /** Japanese Yen (JPY). */
  | 'JPY'
  /** Kenyan Shilling (KES). */
  | 'KES'
  /** Kyrgyzstani Som (KGS). */
  | 'KGS'
  /** Cambodian Riel. */
  | 'KHR'
  /** Kiribati Dollar (KID). */
  | 'KID'
  /** Comorian Franc (KMF). */
  | 'KMF'
  /** South Korean Won (KRW). */
  | 'KRW'
  /** Kuwaiti Dinar (KWD). */
  | 'KWD'
  /** Cayman Dollars (KYD). */
  | 'KYD'
  /** Kazakhstani Tenge (KZT). */
  | 'KZT'
  /** Laotian Kip (LAK). */
  | 'LAK'
  /** Lebanese Pounds (LBP). */
  | 'LBP'
  /** Sri Lankan Rupees (LKR). */
  | 'LKR'
  /** Liberian Dollar (LRD). */
  | 'LRD'
  /** Lesotho Loti (LSL). */
  | 'LSL'
  /** Lithuanian Litai (LTL). */
  | 'LTL'
  /** Latvian Lati (LVL). */
  | 'LVL'
  /** Libyan Dinar (LYD). */
  | 'LYD'
  /** Moroccan Dirham. */
  | 'MAD'
  /** Moldovan Leu (MDL). */
  | 'MDL'
  /** Malagasy Ariary (MGA). */
  | 'MGA'
  /** Macedonia Denar (MKD). */
  | 'MKD'
  /** Burmese Kyat (MMK). */
  | 'MMK'
  /** Mongolian Tugrik. */
  | 'MNT'
  /** Macanese Pataca (MOP). */
  | 'MOP'
  /** Mauritanian Ouguiya (MRU). */
  | 'MRU'
  /** Mauritian Rupee (MUR). */
  | 'MUR'
  /** Maldivian Rufiyaa (MVR). */
  | 'MVR'
  /** Malawian Kwacha (MWK). */
  | 'MWK'
  /** Mexican Pesos (MXN). */
  | 'MXN'
  /** Malaysian Ringgits (MYR). */
  | 'MYR'
  /** Mozambican Metical. */
  | 'MZN'
  /** Namibian Dollar. */
  | 'NAD'
  /** Nigerian Naira (NGN). */
  | 'NGN'
  /** Nicaraguan Córdoba (NIO). */
  | 'NIO'
  /** Norwegian Kroner (NOK). */
  | 'NOK'
  /** Nepalese Rupee (NPR). */
  | 'NPR'
  /** New Zealand Dollars (NZD). */
  | 'NZD'
  /** Omani Rial (OMR). */
  | 'OMR'
  /** Panamian Balboa (PAB). */
  | 'PAB'
  /** Peruvian Nuevo Sol (PEN). */
  | 'PEN'
  /** Papua New Guinean Kina (PGK). */
  | 'PGK'
  /** Philippine Peso (PHP). */
  | 'PHP'
  /** Pakistani Rupee (PKR). */
  | 'PKR'
  /** Polish Zlotych (PLN). */
  | 'PLN'
  /** Paraguayan Guarani (PYG). */
  | 'PYG'
  /** Qatari Rial (QAR). */
  | 'QAR'
  /** Romanian Lei (RON). */
  | 'RON'
  /** Serbian dinar (RSD). */
  | 'RSD'
  /** Russian Rubles (RUB). */
  | 'RUB'
  /** Rwandan Franc (RWF). */
  | 'RWF'
  /** Saudi Riyal (SAR). */
  | 'SAR'
  /** Solomon Islands Dollar (SBD). */
  | 'SBD'
  /** Seychellois Rupee (SCR). */
  | 'SCR'
  /** Sudanese Pound (SDG). */
  | 'SDG'
  /** Swedish Kronor (SEK). */
  | 'SEK'
  /** Singapore Dollars (SGD). */
  | 'SGD'
  /** Saint Helena Pounds (SHP). */
  | 'SHP'
  /** Sierra Leonean Leone (SLL). */
  | 'SLL'
  /** Somali Shilling (SOS). */
  | 'SOS'
  /** Surinamese Dollar (SRD). */
  | 'SRD'
  /** South Sudanese Pound (SSP). */
  | 'SSP'
  /** Sao Tome And Principe Dobra (STD). */
  | 'STD'
  /** Sao Tome And Principe Dobra (STN). */
  | 'STN'
  /** Syrian Pound (SYP). */
  | 'SYP'
  /** Swazi Lilangeni (SZL). */
  | 'SZL'
  /** Thai baht (THB). */
  | 'THB'
  /** Tajikistani Somoni (TJS). */
  | 'TJS'
  /** Turkmenistani Manat (TMT). */
  | 'TMT'
  /** Tunisian Dinar (TND). */
  | 'TND'
  /** Tongan Pa'anga (TOP). */
  | 'TOP'
  /** Turkish Lira (TRY). */
  | 'TRY'
  /** Trinidad and Tobago Dollars (TTD). */
  | 'TTD'
  /** Taiwan Dollars (TWD). */
  | 'TWD'
  /** Tanzanian Shilling (TZS). */
  | 'TZS'
  /** Ukrainian Hryvnia (UAH). */
  | 'UAH'
  /** Ugandan Shilling (UGX). */
  | 'UGX'
  /** United States Dollars (USD). */
  | 'USD'
  /** Uruguayan Pesos (UYU). */
  | 'UYU'
  /** Uzbekistan som (UZS). */
  | 'UZS'
  /** Venezuelan Bolivares (VED). */
  | 'VED'
  /** Venezuelan Bolivares (VEF). */
  | 'VEF'
  /** Venezuelan Bolivares Soberanos (VES). */
  | 'VES'
  /** Vietnamese đồng (VND). */
  | 'VND'
  /** Vanuatu Vatu (VUV). */
  | 'VUV'
  /** Samoan Tala (WST). */
  | 'WST'
  /** Central African CFA Franc (XAF). */
  | 'XAF'
  /** East Caribbean Dollar (XCD). */
  | 'XCD'
  /** West African CFA franc (XOF). */
  | 'XOF'
  /** CFP Franc (XPF). */
  | 'XPF'
  /** Unrecognized currency. */
  | 'XXX'
  /** Yemeni Rial (YER). */
  | 'YER'
  /** South African Rand (ZAR). */
  | 'ZAR'
  /** Zambian Kwacha (ZMW). */
  | 'ZMW';

/**
 * A customer account with the shop. Includes data such as contact information, [addresses](https://shopify.dev/docs/api/storefront/current/objects/MailingAddress) and marketing preferences for logged-in customers, so they don't have to provide these details at every checkout.
 *
 * Access the customer through the [`customer`](https://shopify.dev/docs/api/storefront/current/queries/customer) query using a customer access token obtained from the [`customerAccessTokenCreate`](https://shopify.dev/docs/api/storefront/current/mutations/customerAccessTokenCreate) mutation.
 *
 * The object implements the [`HasMetafields`](https://shopify.dev/docs/api/storefront/current/interfaces/HasMetafields) interface, enabling retrieval of [custom data](https://shopify.dev/docs/apps/build/custom-data) associated with the customer.
 *
 */
export type Customer = HasMetafields & {
  __typename?: 'Customer';
  /** Indicates whether the customer has consented to be sent marketing material via email. */
  acceptsMarketing: Scalars['Boolean']['output'];
  /** A list of addresses for the customer. */
  addresses: MailingAddressConnection;
  /** The URL of the customer's avatar image. */
  avatarUrl?: Maybe<Scalars['String']['output']>;
  /** The date and time when the customer was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The customer’s default address. */
  defaultAddress?: Maybe<MailingAddress>;
  /** The customer’s name, email or phone number. */
  displayName: Scalars['String']['output'];
  /** The customer’s email address. */
  email?: Maybe<Scalars['String']['output']>;
  /** The customer’s first name. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** A unique ID for the customer. */
  id: Scalars['ID']['output'];
  /** The customer’s last name. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
  metafield?: Maybe<Metafield>;
  /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
  metafields: Array<Maybe<Metafield>>;
  /** The number of orders that the customer has made at the store in their lifetime. */
  numberOfOrders: Scalars['UnsignedInt64']['output'];
  /** The orders associated with the customer. */
  orders: OrderConnection;
  /** The customer’s phone number. */
  phone?: Maybe<Scalars['String']['output']>;
  /** The social login provider associated with the customer. */
  socialLoginProvider?: Maybe<SocialLoginProvider>;
  /**
   * A comma separated list of tags that have been added to the customer.
   * Additional access scope required: unauthenticated_read_customer_tags.
   *
   */
  tags: Array<Scalars['String']['output']>;
  /** The date and time when the customer information was updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/**
 * A customer account with the shop. Includes data such as contact information, [addresses](https://shopify.dev/docs/api/storefront/current/objects/MailingAddress) and marketing preferences for logged-in customers, so they don't have to provide these details at every checkout.
 *
 * Access the customer through the [`customer`](https://shopify.dev/docs/api/storefront/current/queries/customer) query using a customer access token obtained from the [`customerAccessTokenCreate`](https://shopify.dev/docs/api/storefront/current/mutations/customerAccessTokenCreate) mutation.
 *
 * The object implements the [`HasMetafields`](https://shopify.dev/docs/api/storefront/current/interfaces/HasMetafields) interface, enabling retrieval of [custom data](https://shopify.dev/docs/apps/build/custom-data) associated with the customer.
 *
 */
export type CustomerAddressesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * A customer account with the shop. Includes data such as contact information, [addresses](https://shopify.dev/docs/api/storefront/current/objects/MailingAddress) and marketing preferences for logged-in customers, so they don't have to provide these details at every checkout.
 *
 * Access the customer through the [`customer`](https://shopify.dev/docs/api/storefront/current/queries/customer) query using a customer access token obtained from the [`customerAccessTokenCreate`](https://shopify.dev/docs/api/storefront/current/mutations/customerAccessTokenCreate) mutation.
 *
 * The object implements the [`HasMetafields`](https://shopify.dev/docs/api/storefront/current/interfaces/HasMetafields) interface, enabling retrieval of [custom data](https://shopify.dev/docs/apps/build/custom-data) associated with the customer.
 *
 */
export type CustomerMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * A customer account with the shop. Includes data such as contact information, [addresses](https://shopify.dev/docs/api/storefront/current/objects/MailingAddress) and marketing preferences for logged-in customers, so they don't have to provide these details at every checkout.
 *
 * Access the customer through the [`customer`](https://shopify.dev/docs/api/storefront/current/queries/customer) query using a customer access token obtained from the [`customerAccessTokenCreate`](https://shopify.dev/docs/api/storefront/current/mutations/customerAccessTokenCreate) mutation.
 *
 * The object implements the [`HasMetafields`](https://shopify.dev/docs/api/storefront/current/interfaces/HasMetafields) interface, enabling retrieval of [custom data](https://shopify.dev/docs/apps/build/custom-data) associated with the customer.
 *
 */
export type CustomerMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/**
 * A customer account with the shop. Includes data such as contact information, [addresses](https://shopify.dev/docs/api/storefront/current/objects/MailingAddress) and marketing preferences for logged-in customers, so they don't have to provide these details at every checkout.
 *
 * Access the customer through the [`customer`](https://shopify.dev/docs/api/storefront/current/queries/customer) query using a customer access token obtained from the [`customerAccessTokenCreate`](https://shopify.dev/docs/api/storefront/current/mutations/customerAccessTokenCreate) mutation.
 *
 * The object implements the [`HasMetafields`](https://shopify.dev/docs/api/storefront/current/interfaces/HasMetafields) interface, enabling retrieval of [custom data](https://shopify.dev/docs/apps/build/custom-data) associated with the customer.
 *
 */
export type CustomerOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<OrderSortKeys>;
};

/**
 * A unique authentication token that identifies a logged-in customer and authorizes modifications to the [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer) object. The token is required for customer-specific operations like updating profile information or managing addresses.
 *
 * Tokens have an expiration date and must be renewed using [`customerAccessTokenRenew`](https://shopify.dev/docs/api/storefront/current/mutations/customerAccessTokenRenew) before they expire. Create tokens with [`customerAccessTokenCreate`](https://shopify.dev/docs/api/storefront/current/mutations/customerAccessTokenCreate) using legacy customer account authentication (email and password), or with [`customerAccessTokenCreateWithMultipass`](https://shopify.dev/docs/api/storefront/current/mutations/customerAccessTokenCreateWithMultipass) for single sign-on flows.
 *
 */
export type CustomerAccessToken = {
  __typename?: 'CustomerAccessToken';
  /** The customer’s access token. */
  accessToken: Scalars['String']['output'];
  /** The date and time when the customer access token expires. */
  expiresAt: Scalars['DateTime']['output'];
};

/**
 * The input fields for authenticating a customer with email and password. Used by the [`customerAccessTokenCreate`](https://shopify.dev/docs/api/storefront/current/mutations/customerAccessTokenCreate) mutation to generate a [`CustomerAccessToken`](https://shopify.dev/docs/api/storefront/current/objects/CustomerAccessToken), which is required to read or modify customer data.
 *
 */
export type CustomerAccessTokenCreateInput = {
  /** The email associated to the customer. */
  email: Scalars['String']['input'];
  /** The login password to be used by the customer. */
  password: Scalars['String']['input'];
};

/** Return type for `customerAccessTokenCreate` mutation. */
export type CustomerAccessTokenCreatePayload = {
  __typename?: 'CustomerAccessTokenCreatePayload';
  /** The newly created customer access token object. */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /** The list of errors that occurred from executing the mutation. */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
};

/** Return type for `customerAccessTokenCreateWithMultipass` mutation. */
export type CustomerAccessTokenCreateWithMultipassPayload = {
  __typename?: 'CustomerAccessTokenCreateWithMultipassPayload';
  /** An access token object associated with the customer. */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /** The list of errors that occurred from executing the mutation. */
  customerUserErrors: Array<CustomerUserError>;
};

/** Return type for `customerAccessTokenDelete` mutation. */
export type CustomerAccessTokenDeletePayload = {
  __typename?: 'CustomerAccessTokenDeletePayload';
  /** The destroyed access token. */
  deletedAccessToken?: Maybe<Scalars['String']['output']>;
  /** ID of the destroyed customer access token. */
  deletedCustomerAccessTokenId?: Maybe<Scalars['String']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserError>;
};

/** Return type for `customerAccessTokenRenew` mutation. */
export type CustomerAccessTokenRenewPayload = {
  __typename?: 'CustomerAccessTokenRenewPayload';
  /** The renewed customer access token object. */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /** The list of errors that occurred from executing the mutation. */
  userErrors: Array<UserError>;
};

/** Return type for `customerActivateByUrl` mutation. */
export type CustomerActivateByUrlPayload = {
  __typename?: 'CustomerActivateByUrlPayload';
  /** The customer that was activated. */
  customer?: Maybe<Customer>;
  /** A new customer access token for the customer. */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /** The list of errors that occurred from executing the mutation. */
  customerUserErrors: Array<CustomerUserError>;
};

/** The input fields to activate a customer. */
export type CustomerActivateInput = {
  /** The activation token required to activate the customer. */
  activationToken: Scalars['String']['input'];
  /** New password that will be set during activation. */
  password: Scalars['String']['input'];
};

/** Return type for `customerActivate` mutation. */
export type CustomerActivatePayload = {
  __typename?: 'CustomerActivatePayload';
  /** The customer object. */
  customer?: Maybe<Customer>;
  /** A newly created customer access token object for the customer. */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /** The list of errors that occurred from executing the mutation. */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
};

/** Return type for `customerAddressCreate` mutation. */
export type CustomerAddressCreatePayload = {
  __typename?: 'CustomerAddressCreatePayload';
  /** The new customer address object. */
  customerAddress?: Maybe<MailingAddress>;
  /** The list of errors that occurred from executing the mutation. */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
};

/** Return type for `customerAddressDelete` mutation. */
export type CustomerAddressDeletePayload = {
  __typename?: 'CustomerAddressDeletePayload';
  /** The list of errors that occurred from executing the mutation. */
  customerUserErrors: Array<CustomerUserError>;
  /** ID of the deleted customer address. */
  deletedCustomerAddressId?: Maybe<Scalars['String']['output']>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
};

/** Return type for `customerAddressUpdate` mutation. */
export type CustomerAddressUpdatePayload = {
  __typename?: 'CustomerAddressUpdatePayload';
  /** The customer’s updated mailing address. */
  customerAddress?: Maybe<MailingAddress>;
  /** The list of errors that occurred from executing the mutation. */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
};

/**
 * The input fields for creating a new [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer) account. Used by the [`customerCreate`](https://shopify.dev/docs/api/storefront/current/mutations/customerCreate) mutation.
 *
 * For legacy customer accounts only and requires an email address and password. Optionally accepts the customer's name, phone number, and email marketing consent.
 *
 * > Caution:
 * > The password is used for customer authentication. Ensure it's transmitted securely and never logged or stored in plain text.
 *
 */
export type CustomerCreateInput = {
  /** Indicates whether the customer has consented to be sent marketing material via email. */
  acceptsMarketing?: InputMaybe<Scalars['Boolean']['input']>;
  /** The customer’s email. */
  email: Scalars['String']['input'];
  /** The customer’s first name. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** The customer’s last name. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** The login password used by the customer. */
  password: Scalars['String']['input'];
  /**
   * A unique phone number for the customer.
   *
   * Formatted using E.164 standard. For example, _+16135551111_.
   *
   */
  phone?: InputMaybe<Scalars['String']['input']>;
};

/** Return type for `customerCreate` mutation. */
export type CustomerCreatePayload = {
  __typename?: 'CustomerCreatePayload';
  /** The created customer object. */
  customer?: Maybe<Customer>;
  /** The list of errors that occurred from executing the mutation. */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
};

/** Return type for `customerDefaultAddressUpdate` mutation. */
export type CustomerDefaultAddressUpdatePayload = {
  __typename?: 'CustomerDefaultAddressUpdatePayload';
  /** The updated customer object. */
  customer?: Maybe<Customer>;
  /** The list of errors that occurred from executing the mutation. */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
};

/**
 * Error codes returned by the [`CustomerUserError`](https://shopify.dev/docs/api/storefront/current/objects/CustomerUserError) object. These codes identify specific validation and processing failures for customer-related mutations, including account creation, updates, password resets, and address management.
 *
 */
export type CustomerErrorCode =
  /** Customer already enabled. */
  | 'ALREADY_ENABLED'
  /** Input email contains an invalid domain name. */
  | 'BAD_DOMAIN'
  /** The input value is blank. */
  | 'BLANK'
  /** Input contains HTML tags. */
  | 'CONTAINS_HTML_TAGS'
  /** Input contains URL. */
  | 'CONTAINS_URL'
  /** Customer is disabled. */
  | 'CUSTOMER_DISABLED'
  /** The input value is invalid. */
  | 'INVALID'
  /** Multipass token is not valid. */
  | 'INVALID_MULTIPASS_REQUEST'
  /** Address does not exist. */
  | 'NOT_FOUND'
  /** Input password starts or ends with whitespace. */
  | 'PASSWORD_STARTS_OR_ENDS_WITH_WHITESPACE'
  /** The input value is already taken. */
  | 'TAKEN'
  /** Invalid activation token. */
  | 'TOKEN_INVALID'
  /** The input value is too long. */
  | 'TOO_LONG'
  /** The input value is too short. */
  | 'TOO_SHORT'
  /** Unidentified customer. */
  | 'UNIDENTIFIED_CUSTOMER';

/** Return type for `customerRecover` mutation. */
export type CustomerRecoverPayload = {
  __typename?: 'CustomerRecoverPayload';
  /** The list of errors that occurred from executing the mutation. */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
};

/** Return type for `customerResetByUrl` mutation. */
export type CustomerResetByUrlPayload = {
  __typename?: 'CustomerResetByUrlPayload';
  /** The customer object which was reset. */
  customer?: Maybe<Customer>;
  /** A newly created customer access token object for the customer. */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /** The list of errors that occurred from executing the mutation. */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
};

/** The input fields to reset a customer's password. */
export type CustomerResetInput = {
  /** New password that will be set as part of the reset password process. */
  password: Scalars['String']['input'];
  /** The reset token required to reset the customer’s password. */
  resetToken: Scalars['String']['input'];
};

/** Return type for `customerReset` mutation. */
export type CustomerResetPayload = {
  __typename?: 'CustomerResetPayload';
  /** The customer object which was reset. */
  customer?: Maybe<Customer>;
  /** A newly created customer access token object for the customer. */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /** The list of errors that occurred from executing the mutation. */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
};

/**
 * The input fields for updating a [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer). Used by the [`customerUpdate`](https://shopify.dev/docs/api/storefront/current/mutations/customerUpdate) mutation.
 *
 * > Caution:
 * > Updating the password invalidates all existing access tokens, including the one used to perform the mutation. The response returns a new access token. Ensure your app handles the new token returned in the response to avoid logging the customer out.
 *
 */
export type CustomerUpdateInput = {
  /** Indicates whether the customer has consented to be sent marketing material via email. */
  acceptsMarketing?: InputMaybe<Scalars['Boolean']['input']>;
  /** The customer’s email. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** The customer’s first name. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** The customer’s last name. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** The login password used by the customer. */
  password?: InputMaybe<Scalars['String']['input']>;
  /**
   * A unique phone number for the customer.
   *
   * Formatted using E.164 standard. For example, _+16135551111_. To remove the phone number, specify `null`.
   *
   */
  phone?: InputMaybe<Scalars['String']['input']>;
};

/** Return type for `customerUpdate` mutation. */
export type CustomerUpdatePayload = {
  __typename?: 'CustomerUpdatePayload';
  /** The updated customer object. */
  customer?: Maybe<Customer>;
  /**
   * The newly created customer access token. If the customer's password is updated, all previous access tokens
   * (including the one used to perform this mutation) become invalid, and a new token is generated.
   *
   */
  customerAccessToken?: Maybe<CustomerAccessToken>;
  /** The list of errors that occurred from executing the mutation. */
  customerUserErrors: Array<CustomerUserError>;
  /**
   * The list of errors that occurred from executing the mutation.
   * @deprecated Use `customerUserErrors` instead.
   */
  userErrors: Array<UserError>;
};

/** Represents an error that happens during execution of a customer mutation. */
export type CustomerUserError = DisplayableError & {
  __typename?: 'CustomerUserError';
  /** The error code. */
  code?: Maybe<CustomerErrorCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** A delivery address of the buyer that is interacting with the cart. */
export type DeliveryAddress = MailingAddress;

/**
 * The input fields for delivery address preferences.
 *
 */
export type DeliveryAddressInput = {
  /**
   * The ID of a customer address that is associated with the buyer that is interacting with the cart.
   *
   */
  customerAddressId?: InputMaybe<Scalars['ID']['input']>;
  /** A delivery address preference of a buyer that is interacting with the cart. */
  deliveryAddress?: InputMaybe<MailingAddressInput>;
  /** Defines what kind of address validation is requested. */
  deliveryAddressValidationStrategy?: InputMaybe<DeliveryAddressValidationStrategy>;
  /**
   * Whether the given delivery address is considered to be a one-time use address. One-time use addresses do not
   * get persisted to the buyer's personal addresses when checking out.
   *
   */
  oneTimeUse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * Controls how delivery addresses are validated during cart operations. The default validation checks only the country code, while strict validation verifies all address fields against Shopify's checkout rules and rejects invalid addresses.
 *
 * Used by [`DeliveryAddressInput`](https://shopify.dev/docs/api/storefront/current/input-objects/DeliveryAddressInput) when setting buyer identity preferences, and by [`CartSelectableAddressInput`](https://shopify.dev/docs/api/storefront/current/input-objects/CartSelectableAddressInput) and [`CartSelectableAddressUpdateInput`](https://shopify.dev/docs/api/storefront/current/input-objects/CartSelectableAddressUpdateInput) when managing cart delivery addresses.
 *
 */
export type DeliveryAddressValidationStrategy =
  /** Only the country code is validated. */
  | 'COUNTRY_CODE_ONLY'
  /**
   * Strict validation is performed, i.e. all fields in the address are validated
   * according to Shopify's checkout rules. If the address fails validation, the cart will not be updated.
   *
   */
  | 'STRICT';

/** List of different delivery method types. */
export type DeliveryMethodType =
  /** Local Delivery. */
  | 'LOCAL'
  /** None. */
  | 'NONE'
  /** Shipping to a Pickup Point. */
  | 'PICKUP_POINT'
  /** Local Pickup. */
  | 'PICK_UP'
  /** Retail. */
  | 'RETAIL'
  /** Shipping. */
  | 'SHIPPING';

/** Digital wallet, such as Apple Pay, which can be used for accelerated checkouts. */
export type DigitalWallet =
  /** Android Pay. */
  | 'ANDROID_PAY'
  /** Apple Pay. */
  | 'APPLE_PAY'
  /** Google Pay. */
  | 'GOOGLE_PAY'
  /** Shopify Pay. */
  | 'SHOPIFY_PAY';

/**
 * The calculated discount amount applied to a line item or shipping line. While a [`DiscountApplication`](https://shopify.dev/docs/api/storefront/current/interfaces/DiscountApplication) captures the discount's rules and intentions, the allocation shows how much was actually deducted.
 *
 * Each allocation includes the discounted amount and a reference to the originating discount application.
 *
 */
export type DiscountAllocation = {
  __typename?: 'DiscountAllocation';
  /** Amount of discount allocated. */
  allocatedAmount: MoneyV2;
  /** The discount this allocated amount originated from. */
  discountApplication:
    | AutomaticDiscountApplication
    | DiscountCodeApplication
    | ManualDiscountApplication
    | ScriptDiscountApplication;
};

/**
 * Captures the intent of a discount at the time it was applied. Each implementation represents a different discount source, such as [automatic discounts](https://help.shopify.com/manual/discounts/discount-methods/automatic-discounts), [discount codes](https://help.shopify.com/manual/discounts/discount-methods/discount-codes), and manual discounts.
 *
 * The actual discounted amount on a line item or shipping line is represented by the [`DiscountAllocation`](https://shopify.dev/docs/api/storefront/current/objects/DiscountAllocation) object, which references the discount application it originated from.
 *
 */
export type DiscountApplication = {
  /** The method by which the discount's value is allocated to its entitled items. */
  allocationMethod: DiscountApplicationAllocationMethod;
  /** Which lines of targetType that the discount is allocated over. */
  targetSelection: DiscountApplicationTargetSelection;
  /** The type of line that the discount is applicable towards. */
  targetType: DiscountApplicationTargetType;
  /** The value of the discount application. */
  value: PricingValue;
};

/**
 * Controls how a discount's value is distributed across entitled lines. A discount can either spread its value across all entitled lines or apply the full value to each line individually.
 *
 * Used by the [`DiscountApplication`](https://shopify.dev/docs/api/storefront/current/interfaces/DiscountApplication) interface and its implementations to capture the intentions of a discount source at the time of application.
 *
 */
export type DiscountApplicationAllocationMethod =
  /** The value is spread across all entitled lines. */
  | 'ACROSS'
  /** The value is applied onto every entitled line. */
  | 'EACH'
  /** The value is specifically applied onto a particular line. */
  | 'ONE';

/**
 * An auto-generated type for paginating through multiple DiscountApplications.
 *
 */
export type DiscountApplicationConnection = {
  __typename?: 'DiscountApplicationConnection';
  /** A list of edges. */
  edges: Array<DiscountApplicationEdge>;
  /** A list of the nodes contained in DiscountApplicationEdge. */
  nodes: Array<
    | AutomaticDiscountApplication
    | DiscountCodeApplication
    | ManualDiscountApplication
    | ScriptDiscountApplication
  >;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one DiscountApplication and a cursor during pagination.
 *
 */
export type DiscountApplicationEdge = {
  __typename?: 'DiscountApplicationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of DiscountApplicationEdge. */
  node:
    | AutomaticDiscountApplication
    | DiscountCodeApplication
    | ManualDiscountApplication
    | ScriptDiscountApplication;
};

/**
 * The lines on the order to which the discount is applied, of the type defined by
 * the discount application's `targetType`. For example, the value `ENTITLED`, combined with a `targetType` of
 * `LINE_ITEM`, applies the discount on all line items that are entitled to the discount.
 * The value `ALL`, combined with a `targetType` of `SHIPPING_LINE`, applies the discount on all shipping lines.
 *
 */
export type DiscountApplicationTargetSelection =
  /** The discount is allocated onto all the lines. */
  | 'ALL'
  /** The discount is allocated onto only the lines that it's entitled for. */
  | 'ENTITLED'
  /** The discount is allocated onto explicitly chosen lines. */
  | 'EXPLICIT';

/**
 * The type of line (i.e. line item or shipping line) on an order that the discount is applicable towards.
 *
 */
export type DiscountApplicationTargetType =
  /** The discount applies onto line items. */
  | 'LINE_ITEM'
  /** The discount applies onto shipping lines. */
  | 'SHIPPING_LINE';

/**
 * Records the configuration and intent of a [discount code](https://help.shopify.com/manual/discounts/discount-methods/discount-codes) when a customer applies it. This includes the code string, allocation method, target type, and discount value at the time of application. The [`applicable`](https://shopify.dev/docs/api/storefront/latest/objects/DiscountCodeApplication#field-DiscountCodeApplication.fields.applicable) field indicates whether the code was successfully applied.
 *
 * > Note:
 * > To see the actual amounts discounted on specific line items or shipping lines, use the [`DiscountAllocation`](https://shopify.dev/docs/api/storefront/current/objects/DiscountAllocation) object instead.
 *
 */
export type DiscountCodeApplication = DiscountApplication & {
  __typename?: 'DiscountCodeApplication';
  /** The method by which the discount's value is allocated to its entitled items. */
  allocationMethod: DiscountApplicationAllocationMethod;
  /** Specifies whether the discount code was applied successfully. */
  applicable: Scalars['Boolean']['output'];
  /** The string identifying the discount code that was used at the time of application. */
  code: Scalars['String']['output'];
  /** Which lines of targetType that the discount is allocated over. */
  targetSelection: DiscountApplicationTargetSelection;
  /** The type of line that the discount is applicable towards. */
  targetType: DiscountApplicationTargetType;
  /** The value of the discount application. */
  value: PricingValue;
};

/** Represents an error in the input of a mutation. */
export type DisplayableError = {
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/**
 * A web address associated with a shop. The [`Shop`](https://shopify.dev/docs/api/storefront/current/objects/Shop) object's [`primaryDomain`](https://shopify.dev/docs/api/storefront/current/objects/Shop#field-Shop.fields.primaryDomain) field returns this to identify the shop's online store URL.
 *
 */
export type Domain = {
  __typename?: 'Domain';
  /** The host name of the domain (eg: `example.com`). */
  host: Scalars['String']['output'];
  /** Whether SSL is enabled or not. */
  sslEnabled: Scalars['Boolean']['output'];
  /** The URL of the domain (eg: `https://example.com`). */
  url: Scalars['URL']['output'];
};

/** Represents a video hosted outside of Shopify. */
export type ExternalVideo = Media &
  Node & {
    __typename?: 'ExternalVideo';
    /** A word or phrase to share the nature or contents of a media. */
    alt?: Maybe<Scalars['String']['output']>;
    /** The embed URL of the video for the respective host. */
    embedUrl: Scalars['URL']['output'];
    /**
     * The URL.
     * @deprecated Use `originUrl` instead.
     */
    embeddedUrl: Scalars['URL']['output'];
    /** The host of the external video. */
    host: MediaHost;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The media content type. */
    mediaContentType: MediaContentType;
    /** The origin URL of the video on the respective host. */
    originUrl: Scalars['URL']['output'];
    /** The presentation for a media. */
    presentation?: Maybe<MediaPresentation>;
    /** The preview image for the media. */
    previewImage?: Maybe<Image>;
  };

/**
 * A filter option available on collection and search results pages. Each filter includes a type, display label, and selectable values that customers can use to narrow down products.
 *
 * The [`FilterValue`](https://shopify.dev/docs/api/storefront/current/objects/FilterValue) objects contain an [`input`](https://shopify.dev/docs/api/storefront/current/objects/FilterValue#field-FilterValue.fields.input) field that you can combine to [build dynamic filtering queries](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/filter-products). Merchants [configure available filters](https://help.shopify.com/manual/online-store/search-and-discovery/filters) using the Shopify Search & Discovery app.
 *
 */
export type Filter = {
  __typename?: 'Filter';
  /** A unique identifier. */
  id: Scalars['String']['output'];
  /** A human-friendly string for this filter. */
  label: Scalars['String']['output'];
  /**
   * Describes how to present the filter values.
   * Returns a value only for filters of type `LIST`. Returns null for other types.
   *
   */
  presentation?: Maybe<FilterPresentation>;
  /** An enumeration that denotes the type of data this filter represents. */
  type: FilterType;
  /** The list of values for this filter. */
  values: Array<FilterValue>;
};

/**
 * Defines how to present the filter values, specifies the presentation of the filter.
 *
 */
export type FilterPresentation =
  /** Image presentation, filter values display an image. */
  | 'IMAGE'
  /** Swatch presentation, filter values display color or image patterns. */
  | 'SWATCH'
  /** Text presentation, no additional visual display for filter values. */
  | 'TEXT';

/**
 * The type of data that the filter group represents.
 *
 * For more information, refer to [Filter products in a collection with the Storefront API]
 * (https://shopify.dev/custom-storefronts/products-collections/filter-products).
 *
 */
export type FilterType =
  /** A boolean value. */
  | 'BOOLEAN'
  /** A list of selectable values. */
  | 'LIST'
  /** A range of prices. */
  | 'PRICE_RANGE';

/**
 * A selectable option within a [`Filter`](https://shopify.dev/docs/api/storefront/current/objects/Filter), such as a specific color, size, or product type. Each value includes a count of matching results and a human-readable label for display.
 *
 * The [`input`](https://shopify.dev/docs/api/storefront/current/objects/FilterValue#field-FilterValue.fields.input) field provides ready-to-use JSON for building dynamic filtering interfaces. You can combine the `input` values from multiple selected [`FilterValue`](https://shopify.dev/docs/api/storefront/current/objects/FilterValue) objects to construct filter queries. Visual representations are available through the [`image`](https://shopify.dev/docs/api/storefront/current/objects/FilterValue#field-FilterValue.fields.image) or [`swatch`](https://shopify.dev/docs/api/storefront/current/objects/FilterValue#field-FilterValue.fields.swatch) fields when the parent filter's presentation type supports them.
 *
 */
export type FilterValue = {
  __typename?: 'FilterValue';
  /** The number of results that match this filter value. */
  count: Scalars['Int']['output'];
  /** A unique identifier. */
  id: Scalars['String']['output'];
  /** The visual representation when the filter's presentation is `IMAGE`. */
  image?: Maybe<MediaImage>;
  /**
   * An input object that can be used to filter by this value on the parent field.
   *
   * The value is provided as a helper for building dynamic filtering UI. For
   * example, if you have a list of selected `FilterValue` objects, you can combine
   * their respective `input` values to use in a subsequent query.
   *
   */
  input: Scalars['JSON']['output'];
  /** A human-friendly string for this filter value. */
  label: Scalars['String']['output'];
  /** The visual representation when the filter's presentation is `SWATCH`. */
  swatch?: Maybe<Swatch>;
};

/**
 * A shipment of one or more items in an order. Accessed through the [`Order`](https://shopify.dev/docs/api/storefront/current/objects/Order) object's [`successfulFulfillments`](https://shopify.dev/docs/api/storefront/current/objects/Order#field-Order.fields.successfulFulfillments) field.
 *
 * Each fulfillment includes the line items that shipped, the tracking company name, and tracking details like numbers and URLs. An order can have multiple fulfillments when items ship separately or from different locations.
 *
 */
export type Fulfillment = {
  __typename?: 'Fulfillment';
  /** List of the fulfillment's line items. */
  fulfillmentLineItems: FulfillmentLineItemConnection;
  /** The name of the tracking company. */
  trackingCompany?: Maybe<Scalars['String']['output']>;
  /**
   * Tracking information associated with the fulfillment,
   * such as the tracking number and tracking URL.
   *
   */
  trackingInfo: Array<FulfillmentTrackingInfo>;
};

/**
 * A shipment of one or more items in an order. Accessed through the [`Order`](https://shopify.dev/docs/api/storefront/current/objects/Order) object's [`successfulFulfillments`](https://shopify.dev/docs/api/storefront/current/objects/Order#field-Order.fields.successfulFulfillments) field.
 *
 * Each fulfillment includes the line items that shipped, the tracking company name, and tracking details like numbers and URLs. An order can have multiple fulfillments when items ship separately or from different locations.
 *
 */
export type FulfillmentFulfillmentLineItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * A shipment of one or more items in an order. Accessed through the [`Order`](https://shopify.dev/docs/api/storefront/current/objects/Order) object's [`successfulFulfillments`](https://shopify.dev/docs/api/storefront/current/objects/Order#field-Order.fields.successfulFulfillments) field.
 *
 * Each fulfillment includes the line items that shipped, the tracking company name, and tracking details like numbers and URLs. An order can have multiple fulfillments when items ship separately or from different locations.
 *
 */
export type FulfillmentTrackingInfoArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * Records how many units of an [`OrderLineItem`](https://shopify.dev/docs/api/storefront/current/objects/OrderLineItem) were included in a [`Fulfillment`](https://shopify.dev/docs/api/storefront/current/objects/Fulfillment). Each order line item has at most one fulfillment line item per fulfillment.
 *
 */
export type FulfillmentLineItem = {
  __typename?: 'FulfillmentLineItem';
  /** The associated order's line item. */
  lineItem: OrderLineItem;
  /** The amount fulfilled in this fulfillment. */
  quantity: Scalars['Int']['output'];
};

/**
 * An auto-generated type for paginating through multiple FulfillmentLineItems.
 *
 */
export type FulfillmentLineItemConnection = {
  __typename?: 'FulfillmentLineItemConnection';
  /** A list of edges. */
  edges: Array<FulfillmentLineItemEdge>;
  /** A list of the nodes contained in FulfillmentLineItemEdge. */
  nodes: Array<FulfillmentLineItem>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one FulfillmentLineItem and a cursor during pagination.
 *
 */
export type FulfillmentLineItemEdge = {
  __typename?: 'FulfillmentLineItemEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of FulfillmentLineItemEdge. */
  node: FulfillmentLineItem;
};

/** Tracking information associated with the fulfillment. */
export type FulfillmentTrackingInfo = {
  __typename?: 'FulfillmentTrackingInfo';
  /** The tracking number of the fulfillment. */
  number?: Maybe<Scalars['String']['output']>;
  /** The URL to track the fulfillment. */
  url?: Maybe<Scalars['URL']['output']>;
};

/**
 * Any file that doesn't fit into a designated type like image or video. For example, a PDF or JSON document. Use this object to manage files in a merchant's store.
 *
 * Generic files are commonly referenced through [file reference metafields](https://shopify.dev/docs/apps/build/metafields/list-of-data-types) and returned as part of the [`MetafieldReference`](https://shopify.dev/docs/api/storefront/current/unions/MetafieldReference) union.
 *
 * Includes the file's URL, MIME type, size in bytes, and an optional preview image.
 *
 */
export type GenericFile = Node & {
  __typename?: 'GenericFile';
  /** A word or phrase to indicate the contents of a file. */
  alt?: Maybe<Scalars['String']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The MIME type of the file. */
  mimeType?: Maybe<Scalars['String']['output']>;
  /** The size of the original file in bytes. */
  originalFileSize?: Maybe<Scalars['Int']['output']>;
  /** The preview image for the file. */
  previewImage?: Maybe<Image>;
  /** The URL of the file. */
  url?: Maybe<Scalars['URL']['output']>;
};

/** The input fields used to specify a geographical location. */
export type GeoCoordinateInput = {
  /** The coordinate's latitude value. */
  latitude: Scalars['Float']['input'];
  /** The coordinate's longitude value. */
  longitude: Scalars['Float']['input'];
};

/**
 * Implemented by resources that support custom metadata through [`Metafield`](https://shopify.dev/docs/api/storefront/current/objects/Metafield) objects. Types like [`Product`](https://shopify.dev/docs/api/storefront/current/objects/Product), [`Collection`](https://shopify.dev/docs/api/storefront/current/objects/Collection), and [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer) implement this interface to provide consistent access to metafields.
 *
 * You can retrieve a [single metafield](https://shopify.dev/docs/api/storefront/current/interfaces/HasMetafields#fields-metafield) by namespace and key, or fetch [multiple metafields](https://shopify.dev/docs/api/storefront/current/interfaces/HasMetafields#fields-metafields) in a single request. If you omit the namespace, then the [app-reserved namespace](https://shopify.dev/docs/apps/build/metafields#app-owned-metafields) is used by default.
 *
 */
export type HasMetafields = {
  /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
  metafield?: Maybe<Metafield>;
  /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
  metafields: Array<Maybe<Metafield>>;
};

/**
 * Implemented by resources that support custom metadata through [`Metafield`](https://shopify.dev/docs/api/storefront/current/objects/Metafield) objects. Types like [`Product`](https://shopify.dev/docs/api/storefront/current/objects/Product), [`Collection`](https://shopify.dev/docs/api/storefront/current/objects/Collection), and [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer) implement this interface to provide consistent access to metafields.
 *
 * You can retrieve a [single metafield](https://shopify.dev/docs/api/storefront/current/interfaces/HasMetafields#fields-metafield) by namespace and key, or fetch [multiple metafields](https://shopify.dev/docs/api/storefront/current/interfaces/HasMetafields#fields-metafields) in a single request. If you omit the namespace, then the [app-reserved namespace](https://shopify.dev/docs/apps/build/metafields#app-owned-metafields) is used by default.
 *
 */
export type HasMetafieldsMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * Implemented by resources that support custom metadata through [`Metafield`](https://shopify.dev/docs/api/storefront/current/objects/Metafield) objects. Types like [`Product`](https://shopify.dev/docs/api/storefront/current/objects/Product), [`Collection`](https://shopify.dev/docs/api/storefront/current/objects/Collection), and [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer) implement this interface to provide consistent access to metafields.
 *
 * You can retrieve a [single metafield](https://shopify.dev/docs/api/storefront/current/interfaces/HasMetafields#fields-metafield) by namespace and key, or fetch [multiple metafields](https://shopify.dev/docs/api/storefront/current/interfaces/HasMetafields#fields-metafields) in a single request. If you omit the namespace, then the [app-reserved namespace](https://shopify.dev/docs/apps/build/metafields#app-owned-metafields) is used by default.
 *
 */
export type HasMetafieldsMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/**
 * The input fields to identify a [`Metafield`](https://shopify.dev/docs/api/storefront/current/objects/Metafield) on an owner resource by namespace and key. Used as an argument to the [`metafields`](https://shopify.dev/docs/api/storefront/current/interfaces/HasMetafields#fields-metafields) field of the `HasMetafields` interface to retrieve multiple metafields in a single request.
 *
 * If you omit the namespace, then the [app-reserved namespace](https://shopify.dev/docs/apps/build/metafields#app-owned-metafields) is used by default.
 *
 */
export type HasMetafieldsIdentifier = {
  /** The identifier for the metafield. */
  key: Scalars['String']['input'];
  /** The container the metafield belongs to. If omitted, the app-reserved namespace will be used. */
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * An image resource with URL, dimensions, and transformation options. Used for product images, collection images, media previews, and other visual content throughout the storefront.
 *
 * The [`url`](https://shopify.dev/docs/api/storefront/current/objects/Image#field-Image.fields.url) field accepts an [`ImageTransformInput`](https://shopify.dev/docs/api/storefront/current/input-objects/ImageTransformInput) argument for resizing, cropping, scaling for retina displays, and converting between image formats. Use the [`thumbhash`](https://shopify.dev/docs/api/storefront/current/objects/Image#field-Image.fields.thumbhash) field to display lightweight placeholders while images load.
 *
 */
export type Image = {
  __typename?: 'Image';
  /** A word or phrase to share the nature or contents of an image. */
  altText?: Maybe<Scalars['String']['output']>;
  /** The original height of the image in pixels. Returns `null` if the image isn't hosted by Shopify. */
  height?: Maybe<Scalars['Int']['output']>;
  /** A unique ID for the image. */
  id?: Maybe<Scalars['ID']['output']>;
  /**
   * The location of the original image as a URL.
   *
   * If there are any existing transformations in the original source URL, they will remain and not be stripped.
   *
   * @deprecated Use `url` instead.
   */
  originalSrc: Scalars['URL']['output'];
  /**
   * The location of the image as a URL.
   * @deprecated Use `url` instead.
   */
  src: Scalars['URL']['output'];
  /**
   * The ThumbHash of the image.
   *
   * Useful to display placeholder images while the original image is loading.
   *
   * See https://evanw.github.io/thumbhash/ for details on how to use it.
   *
   */
  thumbhash?: Maybe<Scalars['String']['output']>;
  /**
   * The location of the transformed image as a URL.
   *
   * All transformation arguments are considered "best-effort". If they can be applied to an image, they will be.
   * Otherwise any transformations which an image type doesn't support will be ignored.
   *
   * @deprecated Use `url(transform:)` instead
   */
  transformedSrc: Scalars['URL']['output'];
  /**
   * The location of the image as a URL.
   *
   * If no transform options are specified, then the original image will be preserved including any pre-applied transforms.
   *
   * All transformation options are considered "best-effort". Any transformation that the original image type doesn't support will be ignored.
   *
   * If you need multiple variations of the same image, then you can use [GraphQL aliases](https://graphql.org/learn/queries/#aliases).
   *
   */
  url: Scalars['URL']['output'];
  /** The original width of the image in pixels. Returns `null` if the image isn't hosted by Shopify. */
  width?: Maybe<Scalars['Int']['output']>;
};

/**
 * An image resource with URL, dimensions, and transformation options. Used for product images, collection images, media previews, and other visual content throughout the storefront.
 *
 * The [`url`](https://shopify.dev/docs/api/storefront/current/objects/Image#field-Image.fields.url) field accepts an [`ImageTransformInput`](https://shopify.dev/docs/api/storefront/current/input-objects/ImageTransformInput) argument for resizing, cropping, scaling for retina displays, and converting between image formats. Use the [`thumbhash`](https://shopify.dev/docs/api/storefront/current/objects/Image#field-Image.fields.thumbhash) field to display lightweight placeholders while images load.
 *
 */
export type ImageTransformedSrcArgs = {
  crop?: InputMaybe<CropRegion>;
  maxHeight?: InputMaybe<Scalars['Int']['input']>;
  maxWidth?: InputMaybe<Scalars['Int']['input']>;
  preferredContentType?: InputMaybe<ImageContentType>;
  scale?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * An image resource with URL, dimensions, and transformation options. Used for product images, collection images, media previews, and other visual content throughout the storefront.
 *
 * The [`url`](https://shopify.dev/docs/api/storefront/current/objects/Image#field-Image.fields.url) field accepts an [`ImageTransformInput`](https://shopify.dev/docs/api/storefront/current/input-objects/ImageTransformInput) argument for resizing, cropping, scaling for retina displays, and converting between image formats. Use the [`thumbhash`](https://shopify.dev/docs/api/storefront/current/objects/Image#field-Image.fields.thumbhash) field to display lightweight placeholders while images load.
 *
 */
export type ImageUrlArgs = {
  transform?: InputMaybe<ImageTransformInput>;
};

/**
 * An auto-generated type for paginating through multiple Images.
 *
 */
export type ImageConnection = {
  __typename?: 'ImageConnection';
  /** A list of edges. */
  edges: Array<ImageEdge>;
  /** A list of the nodes contained in ImageEdge. */
  nodes: Array<Image>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** List of supported image content types. */
export type ImageContentType =
  /** A JPG image. */
  | 'JPG'
  /** A PNG image. */
  | 'PNG'
  /** A WEBP image. */
  | 'WEBP';

/**
 * An auto-generated type which holds one Image and a cursor during pagination.
 *
 */
export type ImageEdge = {
  __typename?: 'ImageEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of ImageEdge. */
  node: Image;
};

/**
 * The available options for transforming an image.
 *
 * All transformation options are considered best effort. Any transformation that
 * the original image type doesn't support will be ignored.
 *
 */
export type ImageTransformInput = {
  /**
   * The region of the image to remain after cropping.
   * Must be used in conjunction with the `maxWidth` and/or `maxHeight` fields,
   * where the `maxWidth` and `maxHeight` aren't equal.
   * The `crop` argument should coincide with the smaller value. A smaller `maxWidth` indicates a `LEFT` or `RIGHT` crop, while
   * a smaller `maxHeight` indicates a `TOP` or `BOTTOM` crop. For example, `{
   * maxWidth: 5, maxHeight: 10, crop: LEFT }` will result
   * in an image with a width of 5 and height of 10, where the right side of the image is removed.
   *
   */
  crop?: InputMaybe<CropRegion>;
  /**
   * Image height in pixels between 1 and 5760.
   *
   */
  maxHeight?: InputMaybe<Scalars['Int']['input']>;
  /**
   * Image width in pixels between 1 and 5760.
   *
   */
  maxWidth?: InputMaybe<Scalars['Int']['input']>;
  /**
   * Convert the source image into the preferred content type.
   * Supported conversions: `.svg` to `.png`, any file type to `.jpg`, and any file type to `.webp`.
   *
   */
  preferredContentType?: InputMaybe<ImageContentType>;
  /**
   * Image size multiplier for high-resolution retina displays. Must be within 1..3.
   *
   */
  scale?: InputMaybe<Scalars['Int']['input']>;
};

/** Provide details about the contexts influenced by the @inContext directive on a field. */
export type InContextAnnotation = {
  __typename?: 'InContextAnnotation';
  description: Scalars['String']['output'];
  type: InContextAnnotationType;
};

/** This gives information about the type of context that impacts a field. For example, for a query with @inContext(language: "EN"), the type would point to the name: LanguageCode and kind: ENUM. */
export type InContextAnnotationType = {
  __typename?: 'InContextAnnotationType';
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

/**
 * A language available for a localized storefront experience. Provides the language name in both its native form (endonym) and translated into the current language, along with its [`LanguageCode`](https://shopify.dev/docs/api/storefront/current/enums/LanguageCode).
 *
 * Returned by the [`Localization`](https://shopify.dev/docs/api/storefront/current/objects/Localization) and [`Country`](https://shopify.dev/docs/api/storefront/current/objects/Country) objects to indicate available and active languages. Pass the `isoCode` to the [`@inContext`](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/in-context) directive to retrieve translated content in that language.
 *
 */
export type Language = {
  __typename?: 'Language';
  /** The name of the language in the language itself. If the language uses capitalization, it is capitalized for a mid-sentence position. */
  endonymName: Scalars['String']['output'];
  /** The ISO code. */
  isoCode: LanguageCode;
  /** The name of the language in the current language. */
  name: Scalars['String']['output'];
};

/**
 * Supported languages for retrieving translated storefront content. Pass a language code to the [`@inContext`](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/in-context) directive to return product titles, descriptions, and other translatable fields in that language.
 *
 * The [`Localization`](https://shopify.dev/docs/api/storefront/current/objects/Localization) object provides the list of available languages for the active country, and each [`Country`](https://shopify.dev/docs/api/storefront/current/objects/Country) in [`availableCountries`](https://shopify.dev/docs/api/storefront/current/objects/Localization#field-Localization.fields.availableCountries) includes its own available languages.
 *
 */
export type LanguageCode =
  /** Afrikaans. */
  | 'AF'
  /** Akan. */
  | 'AK'
  /** Amharic. */
  | 'AM'
  /** Arabic. */
  | 'AR'
  /** Assamese. */
  | 'AS'
  /** Azerbaijani. */
  | 'AZ'
  /** Belarusian. */
  | 'BE'
  /** Bulgarian. */
  | 'BG'
  /** Bambara. */
  | 'BM'
  /** Bangla. */
  | 'BN'
  /** Tibetan. */
  | 'BO'
  /** Breton. */
  | 'BR'
  /** Bosnian. */
  | 'BS'
  /** Catalan. */
  | 'CA'
  /** Chechen. */
  | 'CE'
  /** Central Kurdish. */
  | 'CKB'
  /** Czech. */
  | 'CS'
  /** Church Slavic. */
  | 'CU'
  /** Welsh. */
  | 'CY'
  /** Danish. */
  | 'DA'
  /** German. */
  | 'DE'
  /** Dzongkha. */
  | 'DZ'
  /** Ewe. */
  | 'EE'
  /** Greek. */
  | 'EL'
  /** English. */
  | 'EN'
  /** Esperanto. */
  | 'EO'
  /** Spanish. */
  | 'ES'
  /** Estonian. */
  | 'ET'
  /** Basque. */
  | 'EU'
  /** Persian. */
  | 'FA'
  /** Fulah. */
  | 'FF'
  /** Finnish. */
  | 'FI'
  /** Filipino. */
  | 'FIL'
  /** Faroese. */
  | 'FO'
  /** French. */
  | 'FR'
  /** Western Frisian. */
  | 'FY'
  /** Irish. */
  | 'GA'
  /** Scottish Gaelic. */
  | 'GD'
  /** Galician. */
  | 'GL'
  /** Gujarati. */
  | 'GU'
  /** Manx. */
  | 'GV'
  /** Hausa. */
  | 'HA'
  /** Hebrew. */
  | 'HE'
  /** Hindi. */
  | 'HI'
  /** Croatian. */
  | 'HR'
  /** Hungarian. */
  | 'HU'
  /** Armenian. */
  | 'HY'
  /** Interlingua. */
  | 'IA'
  /** Indonesian. */
  | 'ID'
  /** Igbo. */
  | 'IG'
  /** Sichuan Yi. */
  | 'II'
  /** Icelandic. */
  | 'IS'
  /** Italian. */
  | 'IT'
  /** Japanese. */
  | 'JA'
  /** Javanese. */
  | 'JV'
  /** Georgian. */
  | 'KA'
  /** Kikuyu. */
  | 'KI'
  /** Kazakh. */
  | 'KK'
  /** Kalaallisut. */
  | 'KL'
  /** Khmer. */
  | 'KM'
  /** Kannada. */
  | 'KN'
  /** Korean. */
  | 'KO'
  /** Kashmiri. */
  | 'KS'
  /** Kurdish. */
  | 'KU'
  /** Cornish. */
  | 'KW'
  /** Kyrgyz. */
  | 'KY'
  /** Latin. */
  | 'LA'
  /** Luxembourgish. */
  | 'LB'
  /** Ganda. */
  | 'LG'
  /** Lingala. */
  | 'LN'
  /** Lao. */
  | 'LO'
  /** Lithuanian. */
  | 'LT'
  /** Luba-Katanga. */
  | 'LU'
  /** Latvian. */
  | 'LV'
  /** Malagasy. */
  | 'MG'
  /** Māori. */
  | 'MI'
  /** Macedonian. */
  | 'MK'
  /** Malayalam. */
  | 'ML'
  /** Mongolian. */
  | 'MN'
  /** Moldavian. */
  | 'MO'
  /** Marathi. */
  | 'MR'
  /** Malay. */
  | 'MS'
  /** Maltese. */
  | 'MT'
  /** Burmese. */
  | 'MY'
  /** Norwegian (Bokmål). */
  | 'NB'
  /** North Ndebele. */
  | 'ND'
  /** Nepali. */
  | 'NE'
  /** Dutch. */
  | 'NL'
  /** Norwegian Nynorsk. */
  | 'NN'
  /** Norwegian. */
  | 'NO'
  /** Oromo. */
  | 'OM'
  /** Odia. */
  | 'OR'
  /** Ossetic. */
  | 'OS'
  /** Punjabi. */
  | 'PA'
  /** Polish. */
  | 'PL'
  /** Pashto. */
  | 'PS'
  /** Portuguese. */
  | 'PT'
  /** Portuguese (Brazil). */
  | 'PT_BR'
  /** Portuguese (Portugal). */
  | 'PT_PT'
  /** Quechua. */
  | 'QU'
  /** Romansh. */
  | 'RM'
  /** Rundi. */
  | 'RN'
  /** Romanian. */
  | 'RO'
  /** Russian. */
  | 'RU'
  /** Kinyarwanda. */
  | 'RW'
  /** Sanskrit. */
  | 'SA'
  /** Sardinian. */
  | 'SC'
  /** Sindhi. */
  | 'SD'
  /** Northern Sami. */
  | 'SE'
  /** Sango. */
  | 'SG'
  /** Serbo-Croatian. */
  | 'SH'
  /** Sinhala. */
  | 'SI'
  /** Slovak. */
  | 'SK'
  /** Slovenian. */
  | 'SL'
  /** Shona. */
  | 'SN'
  /** Somali. */
  | 'SO'
  /** Albanian. */
  | 'SQ'
  /** Serbian. */
  | 'SR'
  /** Sundanese. */
  | 'SU'
  /** Swedish. */
  | 'SV'
  /** Swahili. */
  | 'SW'
  /** Tamil. */
  | 'TA'
  /** Telugu. */
  | 'TE'
  /** Tajik. */
  | 'TG'
  /** Thai. */
  | 'TH'
  /** Tigrinya. */
  | 'TI'
  /** Turkmen. */
  | 'TK'
  /** Tongan. */
  | 'TO'
  /** Turkish. */
  | 'TR'
  /** Tatar. */
  | 'TT'
  /** Uyghur. */
  | 'UG'
  /** Ukrainian. */
  | 'UK'
  /** Urdu. */
  | 'UR'
  /** Uzbek. */
  | 'UZ'
  /** Vietnamese. */
  | 'VI'
  /** Volapük. */
  | 'VO'
  /** Wolof. */
  | 'WO'
  /** Xhosa. */
  | 'XH'
  /** Yiddish. */
  | 'YI'
  /** Yoruba. */
  | 'YO'
  /** Chinese. */
  | 'ZH'
  /** Chinese (Simplified). */
  | 'ZH_CN'
  /** Chinese (Traditional). */
  | 'ZH_TW'
  /** Zulu. */
  | 'ZU';

/**
 * Information about the shop's configured localized experiences, including available countries and languages. The [`country`](https://shopify.dev/docs/api/storefront/current/objects/Localization#field-Localization.fields.country) and [`language`](https://shopify.dev/docs/api/storefront/current/objects/Localization#field-Localization.fields.language) fields reflect the active localization context, which you can change using the `@inContext` directive on queries.
 *
 * Use [`availableCountries`](https://shopify.dev/docs/api/storefront/current/objects/Localization#field-Localization.fields.availableCountries) to list all countries with enabled localized experiences, and [`availableLanguages`](https://shopify.dev/docs/api/storefront/current/objects/Localization#field-Localization.fields.availableLanguages) to get languages available for the currently active country. Each [`Country`](https://shopify.dev/docs/api/storefront/current/objects/Country) includes its own currency, unit system, and available languages.
 *
 */
export type Localization = {
  __typename?: 'Localization';
  /** The list of countries with enabled localized experiences. */
  availableCountries: Array<Country>;
  /** The list of languages available for the active country. */
  availableLanguages: Array<Language>;
  /** The country of the active localized experience. Use the `@inContext` directive to change this value. */
  country: Country;
  /** The language of the active localized experience. Use the `@inContext` directive to change this value. */
  language: Language;
  /**
   * The market including the country of the active localized experience. Use the `@inContext` directive to change this value.
   * @deprecated This `market` field will be removed in a future version of the API.
   */
  market: Market;
};

/**
 * A physical store location where product inventory is held and that supports in-store pickup. Provides the location's name, address, and geographic coordinates for proximity-based sorting. Use with [`StoreAvailability`](https://shopify.dev/docs/api/storefront/current/objects/StoreAvailability) to show customers where a [`ProductVariant`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant) is available for pickup.
 *
 * Learn more about [supporting local pickup on storefronts](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/local-pickup).
 *
 */
export type Location = HasMetafields &
  Node & {
    __typename?: 'Location';
    /** The address of the location. */
    address: LocationAddress;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
    metafield?: Maybe<Metafield>;
    /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
    metafields: Array<Maybe<Metafield>>;
    /** The name of the location. */
    name: Scalars['String']['output'];
  };

/**
 * A physical store location where product inventory is held and that supports in-store pickup. Provides the location's name, address, and geographic coordinates for proximity-based sorting. Use with [`StoreAvailability`](https://shopify.dev/docs/api/storefront/current/objects/StoreAvailability) to show customers where a [`ProductVariant`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant) is available for pickup.
 *
 * Learn more about [supporting local pickup on storefronts](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/local-pickup).
 *
 */
export type LocationMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * A physical store location where product inventory is held and that supports in-store pickup. Provides the location's name, address, and geographic coordinates for proximity-based sorting. Use with [`StoreAvailability`](https://shopify.dev/docs/api/storefront/current/objects/StoreAvailability) to show customers where a [`ProductVariant`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant) is available for pickup.
 *
 * Learn more about [supporting local pickup on storefronts](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/local-pickup).
 *
 */
export type LocationMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/**
 * Represents the address of a location.
 *
 */
export type LocationAddress = {
  __typename?: 'LocationAddress';
  /** The first line of the address for the location. */
  address1?: Maybe<Scalars['String']['output']>;
  /** The second line of the address for the location. */
  address2?: Maybe<Scalars['String']['output']>;
  /** The city of the location. */
  city?: Maybe<Scalars['String']['output']>;
  /** The country of the location. */
  country?: Maybe<Scalars['String']['output']>;
  /** The country code of the location. */
  countryCode?: Maybe<Scalars['String']['output']>;
  /** A formatted version of the address for the location. */
  formatted: Array<Scalars['String']['output']>;
  /** The latitude coordinates of the location. */
  latitude?: Maybe<Scalars['Float']['output']>;
  /** The longitude coordinates of the location. */
  longitude?: Maybe<Scalars['Float']['output']>;
  /** The phone number of the location. */
  phone?: Maybe<Scalars['String']['output']>;
  /** The province of the location. */
  province?: Maybe<Scalars['String']['output']>;
  /**
   * The code for the province, state, or district of the address of the location.
   *
   */
  provinceCode?: Maybe<Scalars['String']['output']>;
  /** The ZIP code of the location. */
  zip?: Maybe<Scalars['String']['output']>;
};

/**
 * An auto-generated type for paginating through multiple Locations.
 *
 */
export type LocationConnection = {
  __typename?: 'LocationConnection';
  /** A list of edges. */
  edges: Array<LocationEdge>;
  /** A list of the nodes contained in LocationEdge. */
  nodes: Array<Location>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one Location and a cursor during pagination.
 *
 */
export type LocationEdge = {
  __typename?: 'LocationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of LocationEdge. */
  node: Location;
};

/** The set of valid sort keys for the Location query. */
export type LocationSortKeys =
  /** Sort by the `city` value. */
  | 'CITY'
  /** Sort by the `distance` value. */
  | 'DISTANCE'
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `name` value. */
  | 'NAME';

/**
 * A physical mailing address associated with a [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer) or [`Order`](https://shopify.dev/docs/api/storefront/current/objects/Order). Stores standard address components including street address, city, province, country, and postal code, along with customer name and company information.
 *
 * The address includes geographic coordinates and provides pre-formatted output through the [`formatted`](https://shopify.dev/docs/api/storefront/current/objects/MailingAddress#field-MailingAddress.fields.formatted) field, which can optionally include or exclude name and company details.
 *
 */
export type MailingAddress = Node & {
  __typename?: 'MailingAddress';
  /** The first line of the address. Typically the street address or PO Box number. */
  address1?: Maybe<Scalars['String']['output']>;
  /**
   * The second line of the address. Typically the number of the apartment, suite, or unit.
   *
   */
  address2?: Maybe<Scalars['String']['output']>;
  /** The name of the city, district, village, or town. */
  city?: Maybe<Scalars['String']['output']>;
  /** The name of the customer's company or organization. */
  company?: Maybe<Scalars['String']['output']>;
  /** The name of the country. */
  country?: Maybe<Scalars['String']['output']>;
  /**
   * The two-letter code for the country of the address.
   *
   * For example, US.
   *
   * @deprecated Use `countryCodeV2` instead.
   */
  countryCode?: Maybe<Scalars['String']['output']>;
  /**
   * The two-letter code for the country of the address.
   *
   * For example, US.
   *
   */
  countryCodeV2?: Maybe<CountryCode>;
  /** The first name of the customer. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** A formatted version of the address, customized by the provided arguments. */
  formatted: Array<Scalars['String']['output']>;
  /** A comma-separated list of the values for city, province, and country. */
  formattedArea?: Maybe<Scalars['String']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The last name of the customer. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** The latitude coordinate of the customer address. */
  latitude?: Maybe<Scalars['Float']['output']>;
  /** The longitude coordinate of the customer address. */
  longitude?: Maybe<Scalars['Float']['output']>;
  /** The full name of the customer, based on firstName and lastName. */
  name?: Maybe<Scalars['String']['output']>;
  /**
   * A unique phone number for the customer.
   *
   * Formatted using E.164 standard. For example, _+16135551111_.
   *
   */
  phone?: Maybe<Scalars['String']['output']>;
  /** The region of the address, such as the province, state, or district. */
  province?: Maybe<Scalars['String']['output']>;
  /**
   * The alphanumeric code for the region.
   *
   * For example, ON.
   *
   */
  provinceCode?: Maybe<Scalars['String']['output']>;
  /** The zip or postal code of the address. */
  zip?: Maybe<Scalars['String']['output']>;
};

/**
 * A physical mailing address associated with a [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer) or [`Order`](https://shopify.dev/docs/api/storefront/current/objects/Order). Stores standard address components including street address, city, province, country, and postal code, along with customer name and company information.
 *
 * The address includes geographic coordinates and provides pre-formatted output through the [`formatted`](https://shopify.dev/docs/api/storefront/current/objects/MailingAddress#field-MailingAddress.fields.formatted) field, which can optionally include or exclude name and company details.
 *
 */
export type MailingAddressFormattedArgs = {
  withCompany?: InputMaybe<Scalars['Boolean']['input']>;
  withName?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * An auto-generated type for paginating through multiple MailingAddresses.
 *
 */
export type MailingAddressConnection = {
  __typename?: 'MailingAddressConnection';
  /** A list of edges. */
  edges: Array<MailingAddressEdge>;
  /** A list of the nodes contained in MailingAddressEdge. */
  nodes: Array<MailingAddress>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one MailingAddress and a cursor during pagination.
 *
 */
export type MailingAddressEdge = {
  __typename?: 'MailingAddressEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of MailingAddressEdge. */
  node: MailingAddress;
};

/**
 * The input fields for creating or updating a [`MailingAddress`](https://shopify.dev/docs/api/storefront/current/objects/MailingAddress). Accepts standard address components including street address, city, province, country, and postal code, along with customer name and contact information.
 *
 * Used by the [`customerAddressCreate`](https://shopify.dev/docs/api/storefront/current/mutations/customerAddressCreate) and [`customerAddressUpdate`](https://shopify.dev/docs/api/storefront/current/mutations/customerAddressUpdate) mutations, and as part of [`DeliveryAddressInput`](https://shopify.dev/docs/api/storefront/current/input-objects/DeliveryAddressInput) for cart delivery preferences.
 *
 */
export type MailingAddressInput = {
  /**
   * The first line of the address. Typically the street address or PO Box number.
   *
   */
  address1?: InputMaybe<Scalars['String']['input']>;
  /**
   * The second line of the address. Typically the number of the apartment, suite, or unit.
   *
   */
  address2?: InputMaybe<Scalars['String']['input']>;
  /**
   * The name of the city, district, village, or town.
   *
   */
  city?: InputMaybe<Scalars['String']['input']>;
  /**
   * The name of the customer's company or organization.
   *
   */
  company?: InputMaybe<Scalars['String']['input']>;
  /** The name of the country. */
  country?: InputMaybe<Scalars['String']['input']>;
  /** The first name of the customer. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** The last name of the customer. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /**
   * A unique phone number for the customer.
   *
   * Formatted using E.164 standard. For example, _+16135551111_.
   *
   */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** The region of the address, such as the province, state, or district. */
  province?: InputMaybe<Scalars['String']['input']>;
  /** The zip or postal code of the address. */
  zip?: InputMaybe<Scalars['String']['input']>;
};

/**
 * A discount created manually by a merchant, as opposed to [automatic discounts](https://help.shopify.com/manual/discounts/discount-methods/automatic-discounts) or [discount codes](https://help.shopify.com/manual/discounts/discount-methods/discount-codes). Implements the [`DiscountApplication`](https://shopify.dev/docs/api/storefront/current/interfaces/DiscountApplication) interface and includes a title, optional description, and the discount value as either a fixed amount or percentage.
 *
 */
export type ManualDiscountApplication = DiscountApplication & {
  __typename?: 'ManualDiscountApplication';
  /** The method by which the discount's value is allocated to its entitled items. */
  allocationMethod: DiscountApplicationAllocationMethod;
  /** The description of the application. */
  description?: Maybe<Scalars['String']['output']>;
  /** Which lines of targetType that the discount is allocated over. */
  targetSelection: DiscountApplicationTargetSelection;
  /** The type of line that the discount is applicable towards. */
  targetType: DiscountApplicationTargetType;
  /** The title of the application. */
  title: Scalars['String']['output'];
  /** The value of the discount application. */
  value: PricingValue;
};

/**
 * An audience of buyers that a merchant targets for sales. Audiences can include geographic regions, company locations, and retail locations. Markets enable localized shopping experiences with region-specific languages, currencies, and pricing.
 *
 * Each market has a unique [`handle`](https://shopify.dev/docs/api/storefront/current/objects/Market#field-Market.fields.handle) for identification and supports custom data through [`metafields`](https://shopify.dev/docs/api/storefront/current/objects/Metafield). Learn more about [building localized experiences with Shopify Markets](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/markets).
 *
 */
export type Market = HasMetafields &
  Node & {
    __typename?: 'Market';
    /**
     * A human-readable unique string for the market automatically generated from its title.
     *
     */
    handle: Scalars['String']['output'];
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
    metafield?: Maybe<Metafield>;
    /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
    metafields: Array<Maybe<Metafield>>;
  };

/**
 * An audience of buyers that a merchant targets for sales. Audiences can include geographic regions, company locations, and retail locations. Markets enable localized shopping experiences with region-specific languages, currencies, and pricing.
 *
 * Each market has a unique [`handle`](https://shopify.dev/docs/api/storefront/current/objects/Market#field-Market.fields.handle) for identification and supports custom data through [`metafields`](https://shopify.dev/docs/api/storefront/current/objects/Metafield). Learn more about [building localized experiences with Shopify Markets](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/markets).
 *
 */
export type MarketMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * An audience of buyers that a merchant targets for sales. Audiences can include geographic regions, company locations, and retail locations. Markets enable localized shopping experiences with region-specific languages, currencies, and pricing.
 *
 * Each market has a unique [`handle`](https://shopify.dev/docs/api/storefront/current/objects/Market#field-Market.fields.handle) for identification and supports custom data through [`metafields`](https://shopify.dev/docs/api/storefront/current/objects/Metafield). Learn more about [building localized experiences with Shopify Markets](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/markets).
 *
 */
export type MarketMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/**
 * A common set of fields for media content associated with [products](https://shopify.dev/docs/api/storefront/current/objects/Product). Implementations include [`MediaImage`](https://shopify.dev/docs/api/storefront/current/objects/MediaImage) for Shopify-hosted images, [`Video`](https://shopify.dev/docs/api/storefront/current/objects/Video) for Shopify-hosted videos, [`ExternalVideo`](https://shopify.dev/docs/api/storefront/current/objects/ExternalVideo) for videos hosted on platforms like YouTube or Vimeo, and [`Model3d`](https://shopify.dev/docs/api/storefront/current/objects/Model3d) for 3D models.
 *
 * Each implementation shares fields for alt text, content type, and preview images, while adding type-specific fields like embed URLs for external videos or source files for 3D models.
 *
 */
export type Media = {
  /** A word or phrase to share the nature or contents of a media. */
  alt?: Maybe<Scalars['String']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The media content type. */
  mediaContentType: MediaContentType;
  /** The presentation for a media. */
  presentation?: Maybe<MediaPresentation>;
  /** The preview image for the media. */
  previewImage?: Maybe<Image>;
};

/**
 * An auto-generated type for paginating through multiple Media.
 *
 */
export type MediaConnection = {
  __typename?: 'MediaConnection';
  /** A list of edges. */
  edges: Array<MediaEdge>;
  /** A list of the nodes contained in MediaEdge. */
  nodes: Array<ExternalVideo | MediaImage | Model3d | Video>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** The possible content types for a media object. */
export type MediaContentType =
  /** An externally hosted video. */
  | 'EXTERNAL_VIDEO'
  /** A Shopify hosted image. */
  | 'IMAGE'
  /** A 3d model. */
  | 'MODEL_3D'
  /** A Shopify hosted video. */
  | 'VIDEO';

/**
 * An auto-generated type which holds one Media and a cursor during pagination.
 *
 */
export type MediaEdge = {
  __typename?: 'MediaEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of MediaEdge. */
  node: ExternalVideo | MediaImage | Model3d | Video;
};

/** Host for a Media Resource. */
export type MediaHost =
  /** Host for Vimeo embedded videos. */
  | 'VIMEO'
  /** Host for YouTube embedded videos. */
  | 'YOUTUBE';

/**
 * An image hosted on Shopify's content delivery network (CDN). Used for product images, brand logos, and other visual content across the storefront.
 *
 * The [`image`](https://shopify.dev/docs/api/storefront/current/objects/MediaImage#field-MediaImage.fields.image) field provides the actual image data with transformation options. Implements the [`Media`](https://shopify.dev/docs/api/storefront/current/interfaces/Media) interface alongside other media types like [`Video`](https://shopify.dev/docs/api/storefront/current/objects/Video) and [`Model3d`](https://shopify.dev/docs/api/storefront/current/objects/Model3d).
 *
 */
export type MediaImage = Media &
  Node & {
    __typename?: 'MediaImage';
    /** A word or phrase to share the nature or contents of a media. */
    alt?: Maybe<Scalars['String']['output']>;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The image for the media. */
    image?: Maybe<Image>;
    /** The media content type. */
    mediaContentType: MediaContentType;
    /** The presentation for a media. */
    presentation?: Maybe<MediaPresentation>;
    /** The preview image for the media. */
    previewImage?: Maybe<Image>;
  };

/** A media presentation. */
export type MediaPresentation = Node & {
  __typename?: 'MediaPresentation';
  /** A JSON object representing a presentation view. */
  asJson?: Maybe<Scalars['JSON']['output']>;
  /**
   * A globally-unique ID.
   * @deprecated MediaPresentation IDs are being deprecated. Access the data directly via the asJson field on the Media type.
   */
  id: Scalars['ID']['output'];
};

/** A media presentation. */
export type MediaPresentationAsJsonArgs = {
  format: MediaPresentationFormat;
};

/** The possible formats for a media presentation. */
export type MediaPresentationFormat =
  /** A media image presentation. */
  | 'IMAGE'
  /** A model viewer presentation. */
  | 'MODEL_VIEWER';

/**
 * A navigation structure for building store [menus](https://help.shopify.com/manual/online-store/menus-and-links). Each menu contains [`MenuItem`](https://shopify.dev/docs/api/storefront/current/objects/MenuItem) objects that can be nested to create multi-level navigation hierarchies.
 *
 * Menu items can link to [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), [products](https://shopify.dev/docs/api/storefront/current/objects/Product), [pages](https://shopify.dev/docs/api/storefront/current/objects/Page), [blogs](https://shopify.dev/docs/api/storefront/current/objects/Blog), or external URLs. Use the [`menu`](https://shopify.dev/docs/api/storefront/current/queries/menu) query to retrieve a menu by its handle.
 *
 */
export type Menu = Node & {
  __typename?: 'Menu';
  /** The menu's handle. */
  handle: Scalars['String']['output'];
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The menu's child items. */
  items: Array<MenuItem>;
  /** The count of items on the menu. */
  itemsCount: Scalars['Int']['output'];
  /** The menu's title. */
  title: Scalars['String']['output'];
};

/**
 * A navigation link within a [`Menu`](https://shopify.dev/docs/api/storefront/current/objects/Menu). Each item has a title, URL, and can link to store resources like [products](https://shopify.dev/docs/api/storefront/current/objects/Product), [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), [pages](https://shopify.dev/docs/api/storefront/current/objects/Page), [blogs](https://shopify.dev/docs/api/storefront/current/objects/Blog), or external URLs.
 *
 * Menu items support nested hierarchies through the [`items`](https://shopify.dev/docs/api/storefront/current/objects/MenuItem#field-MenuItem.fields.items) field, enabling dropdown or multi-level navigation structures. The [`tags`](https://shopify.dev/docs/api/storefront/current/objects/MenuItem#field-MenuItem.fields.tags) field filters results when the item links to a collection specifically.
 *
 */
export type MenuItem = Node & {
  __typename?: 'MenuItem';
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The menu item's child items. */
  items: Array<MenuItem>;
  /** The linked resource. */
  resource?: Maybe<MenuItemResource>;
  /** The ID of the linked resource. */
  resourceId?: Maybe<Scalars['ID']['output']>;
  /** The menu item's tags to filter a collection. */
  tags: Array<Scalars['String']['output']>;
  /** The menu item's title. */
  title: Scalars['String']['output'];
  /** The menu item's type. */
  type: MenuItemType;
  /** The menu item's URL. */
  url?: Maybe<Scalars['URL']['output']>;
};

/**
 * The list of possible resources a `MenuItem` can reference.
 *
 */
export type MenuItemResource =
  | Article
  | Blog
  | Collection
  | Metaobject
  | Page
  | Product
  | ShopPolicy;

/** A menu item type. */
export type MenuItemType =
  /** An article link. */
  | 'ARTICLE'
  /** A blog link. */
  | 'BLOG'
  /** A catalog link. */
  | 'CATALOG'
  /** A collection link. */
  | 'COLLECTION'
  /** A collection link. */
  | 'COLLECTIONS'
  /** A customer account page link. */
  | 'CUSTOMER_ACCOUNT_PAGE'
  /** A frontpage link. */
  | 'FRONTPAGE'
  /** An http link. */
  | 'HTTP'
  /** A metaobject page link. */
  | 'METAOBJECT'
  /** A page link. */
  | 'PAGE'
  /** A product link. */
  | 'PRODUCT'
  /** A search link. */
  | 'SEARCH'
  /** A shop policy link. */
  | 'SHOP_POLICY';

/**
 * A [`ProductVariant`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant) that a buyer intends to purchase at checkout.
 *
 */
export type Merchandise = ProductVariant;

/**
 * [Custom metadata](https://shopify.dev/docs/apps/build/metafields) attached to a Shopify resource such as a [`Product`](https://shopify.dev/docs/api/storefront/current/objects/Product), [`Collection`](https://shopify.dev/docs/api/storefront/current/objects/Collection), or [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer). Each metafield is identified by a namespace and key, and stores a value with an associated type.
 *
 * Values are always stored as strings, but the [`type`](https://shopify.dev/docs/api/storefront/current/objects/Metafield#field-Metafield.fields.type) field indicates how to interpret the data. When a metafield's type is a resource reference, use the [`reference`](https://shopify.dev/docs/api/storefront/current/objects/Metafield#field-Metafield.fields.reference) or [`references`](https://shopify.dev/docs/api/storefront/current/objects/Metafield#field-Metafield.fields.references) fields to retrieve the linked objects. Access metafields on any resource that implements the [`HasMetafields`](https://shopify.dev/docs/api/storefront/current/interfaces/HasMetafields) interface.
 *
 */
export type Metafield = Node & {
  __typename?: 'Metafield';
  /** The date and time when the storefront metafield was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The description of a metafield. */
  description?: Maybe<Scalars['String']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The unique identifier for the metafield within its namespace. */
  key: Scalars['String']['output'];
  /** The container for a group of metafields that the metafield is associated with. */
  namespace: Scalars['String']['output'];
  /** The type of resource that the metafield is attached to. */
  parentResource: MetafieldParentResource;
  /** Returns a reference object if the metafield's type is a resource reference. */
  reference?: Maybe<MetafieldReference>;
  /** A list of reference objects if the metafield's type is a resource reference list. */
  references?: Maybe<MetafieldReferenceConnection>;
  /**
   * The type name of the metafield.
   * Refer to the list of [supported types](https://shopify.dev/apps/metafields/definitions/types).
   *
   */
  type: Scalars['String']['output'];
  /** The date and time when the metafield was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** The data stored in the metafield. Always stored as a string, regardless of the metafield's type. */
  value: Scalars['String']['output'];
};

/**
 * [Custom metadata](https://shopify.dev/docs/apps/build/metafields) attached to a Shopify resource such as a [`Product`](https://shopify.dev/docs/api/storefront/current/objects/Product), [`Collection`](https://shopify.dev/docs/api/storefront/current/objects/Collection), or [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer). Each metafield is identified by a namespace and key, and stores a value with an associated type.
 *
 * Values are always stored as strings, but the [`type`](https://shopify.dev/docs/api/storefront/current/objects/Metafield#field-Metafield.fields.type) field indicates how to interpret the data. When a metafield's type is a resource reference, use the [`reference`](https://shopify.dev/docs/api/storefront/current/objects/Metafield#field-Metafield.fields.reference) or [`references`](https://shopify.dev/docs/api/storefront/current/objects/Metafield#field-Metafield.fields.references) fields to retrieve the linked objects. Access metafields on any resource that implements the [`HasMetafields`](https://shopify.dev/docs/api/storefront/current/interfaces/HasMetafields) interface.
 *
 */
export type MetafieldReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Possible error codes that can be returned by `MetafieldDeleteUserError`. */
export type MetafieldDeleteErrorCode =
  /** The current app is not authorized to perform this action. */
  | 'APP_NOT_AUTHORIZED'
  /** The owner ID is invalid. */
  | 'INVALID_OWNER'
  /** Metafield not found. */
  | 'METAFIELD_DOES_NOT_EXIST';

/** An error that occurs during the execution of cart metafield deletion. */
export type MetafieldDeleteUserError = DisplayableError & {
  __typename?: 'MetafieldDeleteUserError';
  /** The error code. */
  code?: Maybe<MetafieldDeleteErrorCode>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/**
 * Filters products in a collection by matching a specific metafield value. Used by the [`ProductFilter`](https://shopify.dev/docs/api/storefront/current/input-objects/ProductFilter) input's `productMetafield` and `variantMetafield` fields.
 *
 * Supports the following metafield types: `number_integer`, `number_decimal`, `single_line_text_field`, and `boolean`.
 *
 */
export type MetafieldFilter = {
  /** The key of the metafield to filter on. */
  key: Scalars['String']['input'];
  /** The namespace of the metafield to filter on. */
  namespace: Scalars['String']['input'];
  /** The value of the metafield. */
  value: Scalars['String']['input'];
};

/**
 * The Shopify resource that owns a metafield. Returned by the `Metafield` object's [`parentResource`](https://shopify.dev/docs/api/storefront/current/objects/Metafield#field-Metafield.fields.parentResource) field, enabling traversal from a metafield back to the resource it's attached to.
 *
 */
export type MetafieldParentResource =
  | Article
  | Blog
  | Cart
  | Collection
  | Company
  | CompanyLocation
  | Customer
  | Location
  | Market
  | Order
  | Page
  | Product
  | ProductVariant
  | SellingPlan
  | Shop;

/**
 * The resource that a metafield points to when its type is a resource reference. Metafields can store references to other Shopify resources, and this union provides access to the actual referenced object.
 *
 * Returned by the `Metafield` object's [`reference`](https://shopify.dev/docs/api/storefront/current/objects/Metafield#field-Metafield.fields.reference) field for single references or the [`references`](https://shopify.dev/docs/api/storefront/current/objects/Metafield#field-Metafield.fields.references) field for lists.
 *
 */
export type MetafieldReference =
  | Article
  | Collection
  | GenericFile
  | MediaImage
  | Metaobject
  | Model3d
  | Page
  | Product
  | ProductVariant
  | Video;

/**
 * An auto-generated type for paginating through multiple MetafieldReferences.
 *
 */
export type MetafieldReferenceConnection = {
  __typename?: 'MetafieldReferenceConnection';
  /** A list of edges. */
  edges: Array<MetafieldReferenceEdge>;
  /** A list of the nodes contained in MetafieldReferenceEdge. */
  nodes: Array<MetafieldReference>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one MetafieldReference and a cursor during pagination.
 *
 */
export type MetafieldReferenceEdge = {
  __typename?: 'MetafieldReferenceEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of MetafieldReferenceEdge. */
  node: MetafieldReference;
};

/** An error that occurs during the execution of `MetafieldsSet`. */
export type MetafieldsSetUserError = DisplayableError & {
  __typename?: 'MetafieldsSetUserError';
  /** The error code. */
  code?: Maybe<MetafieldsSetUserErrorCode>;
  /** The index of the array element that's causing the error. */
  elementIndex?: Maybe<Scalars['Int']['output']>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Possible error codes that can be returned by `MetafieldsSetUserError`. */
export type MetafieldsSetUserErrorCode =
  /** The current app is not authorized to perform this action. */
  | 'APP_NOT_AUTHORIZED'
  /** The input value is blank. */
  | 'BLANK'
  /** The input value isn't included in the list. */
  | 'INCLUSION'
  /** The owner ID is invalid. */
  | 'INVALID_OWNER'
  /** The type is invalid. */
  | 'INVALID_TYPE'
  /** The value is invalid for metafield type or for definition options. */
  | 'INVALID_VALUE'
  /** The input value should be less than or equal to the maximum value allowed. */
  | 'LESS_THAN_OR_EQUAL_TO'
  /** The input value needs to be blank. */
  | 'PRESENT'
  /** The input value is too long. */
  | 'TOO_LONG'
  /** The input value is too short. */
  | 'TOO_SHORT';

/**
 * An instance of [custom structured data](https://shopify.dev/docs/apps/build/metaobjects) defined by a metaobject definition. Metaobjects store reusable content that extends beyond standard Shopify resources, such as size charts, author profiles, or custom content sections.
 *
 * Each metaobject contains fields that match the types and validation rules specified in its definition. [`Metafield`](https://shopify.dev/docs/api/storefront/current/objects/Metafield) references can point to metaobjects, connecting custom data with products, collections, and other resources. If the definition has the `renderable` capability, then the [`seo`](https://shopify.dev/docs/api/storefront/current/objects/Metaobject#field-Metaobject.fields.seo) field provides SEO metadata. If it has the `online_store` capability, then the [`onlineStoreUrl`](https://shopify.dev/docs/api/storefront/current/objects/Metaobject#field-Metaobject.fields.onlineStoreUrl) field returns the public URL.
 *
 */
export type Metaobject = Node &
  OnlineStorePublishable & {
    __typename?: 'Metaobject';
    /** Accesses a field of the object by key. */
    field?: Maybe<MetaobjectField>;
    /**
     * All object fields with defined values.
     * Omitted object keys can be assumed null, and no guarantees are made about field order.
     *
     */
    fields: Array<MetaobjectField>;
    /** The unique handle of the metaobject. Useful as a custom ID. */
    handle: Scalars['String']['output'];
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The URL used for viewing the metaobject on the shop's Online Store. Returns `null` if the metaobject definition doesn't have the `online_store` capability. */
    onlineStoreUrl?: Maybe<Scalars['URL']['output']>;
    /**
     * The metaobject's SEO information. Returns `null` if the metaobject definition
     * doesn't have the `renderable` capability.
     *
     */
    seo?: Maybe<MetaobjectSeo>;
    /** The type of the metaobject. */
    type: Scalars['String']['output'];
    /** The date and time when the metaobject was last updated. */
    updatedAt: Scalars['DateTime']['output'];
  };

/**
 * An instance of [custom structured data](https://shopify.dev/docs/apps/build/metaobjects) defined by a metaobject definition. Metaobjects store reusable content that extends beyond standard Shopify resources, such as size charts, author profiles, or custom content sections.
 *
 * Each metaobject contains fields that match the types and validation rules specified in its definition. [`Metafield`](https://shopify.dev/docs/api/storefront/current/objects/Metafield) references can point to metaobjects, connecting custom data with products, collections, and other resources. If the definition has the `renderable` capability, then the [`seo`](https://shopify.dev/docs/api/storefront/current/objects/Metaobject#field-Metaobject.fields.seo) field provides SEO metadata. If it has the `online_store` capability, then the [`onlineStoreUrl`](https://shopify.dev/docs/api/storefront/current/objects/Metaobject#field-Metaobject.fields.onlineStoreUrl) field returns the public URL.
 *
 */
export type MetaobjectFieldArgs = {
  key: Scalars['String']['input'];
};

/**
 * An auto-generated type for paginating through multiple Metaobjects.
 *
 */
export type MetaobjectConnection = {
  __typename?: 'MetaobjectConnection';
  /** A list of edges. */
  edges: Array<MetaobjectEdge>;
  /** A list of the nodes contained in MetaobjectEdge. */
  nodes: Array<Metaobject>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one Metaobject and a cursor during pagination.
 *
 */
export type MetaobjectEdge = {
  __typename?: 'MetaobjectEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of MetaobjectEdge. */
  node: Metaobject;
};

/**
 * The value of a field within a [`Metaobject`](https://shopify.dev/docs/api/storefront/current/objects/Metaobject). For fields that reference other resources, use the [`reference`](https://shopify.dev/docs/api/storefront/current/objects/MetaobjectField#field-MetaobjectField.fields.reference) field for single references or [`references`](https://shopify.dev/docs/api/storefront/current/objects/MetaobjectField#field-MetaobjectField.fields.references) for lists.
 *
 */
export type MetaobjectField = {
  __typename?: 'MetaobjectField';
  /** The field key. */
  key: Scalars['String']['output'];
  /** A referenced object if the field type is a resource reference. */
  reference?: Maybe<MetafieldReference>;
  /** A list of referenced objects if the field type is a resource reference list. */
  references?: Maybe<MetafieldReferenceConnection>;
  /**
   * The type name of the field.
   * See the list of [supported types](https://shopify.dev/apps/metafields/definitions/types).
   *
   */
  type: Scalars['String']['output'];
  /** The field value. */
  value?: Maybe<Scalars['String']['output']>;
};

/**
 * The value of a field within a [`Metaobject`](https://shopify.dev/docs/api/storefront/current/objects/Metaobject). For fields that reference other resources, use the [`reference`](https://shopify.dev/docs/api/storefront/current/objects/MetaobjectField#field-MetaobjectField.fields.reference) field for single references or [`references`](https://shopify.dev/docs/api/storefront/current/objects/MetaobjectField#field-MetaobjectField.fields.references) for lists.
 *
 */
export type MetaobjectFieldReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** The input fields used to retrieve a metaobject by handle. */
export type MetaobjectHandleInput = {
  /** The handle of the metaobject. */
  handle: Scalars['String']['input'];
  /** The type of the metaobject. */
  type: Scalars['String']['input'];
};

/** SEO information for a metaobject. */
export type MetaobjectSeo = {
  __typename?: 'MetaobjectSEO';
  /** The meta description. */
  description?: Maybe<MetaobjectField>;
  /** The SEO title. */
  title?: Maybe<MetaobjectField>;
};

/** Represents a Shopify hosted 3D model. */
export type Model3d = Media &
  Node & {
    __typename?: 'Model3d';
    /** A word or phrase to share the nature or contents of a media. */
    alt?: Maybe<Scalars['String']['output']>;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The media content type. */
    mediaContentType: MediaContentType;
    /** The presentation for a media. */
    presentation?: Maybe<MediaPresentation>;
    /** The preview image for the media. */
    previewImage?: Maybe<Image>;
    /** The sources for a 3d model. */
    sources: Array<Model3dSource>;
  };

/** Represents a source for a Shopify hosted 3d model. */
export type Model3dSource = {
  __typename?: 'Model3dSource';
  /** The filesize of the 3d model. */
  filesize: Scalars['Int']['output'];
  /** The format of the 3d model. */
  format: Scalars['String']['output'];
  /** The MIME type of the 3d model. */
  mimeType: Scalars['String']['output'];
  /** The URL of the 3d model. */
  url: Scalars['String']['output'];
};

/** The input fields for a monetary value with currency. */
export type MoneyInput = {
  /** Decimal money amount. */
  amount: Scalars['Decimal']['input'];
  /** Currency of the money. */
  currencyCode: CurrencyCode;
};

/**
 * A precise monetary value with its associated currency. Combines a decimal amount with a three-letter [`CurrencyCode`](https://shopify.dev/docs/api/storefront/current/enums/CurrencyCode) to express prices, costs, and other financial values. For example, 12.99 USD.
 *
 */
export type MoneyV2 = {
  __typename?: 'MoneyV2';
  /** Decimal money amount. */
  amount: Scalars['Decimal']['output'];
  /** Currency of the money. */
  currencyCode: CurrencyCode;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type Mutation = {
  __typename?: 'Mutation';
  /**
   * Updates the attributes on a [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart). Attributes are custom key-value pairs that store additional information, such as gift messages, special instructions, or order notes.
   *
   */
  cartAttributesUpdate?: Maybe<CartAttributesUpdatePayload>;
  /** Updates the billing address on the cart. */
  cartBillingAddressUpdate?: Maybe<CartBillingAddressUpdatePayload>;
  /**
   * Updates the buyer identity on a [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart), including contact information, location, and checkout preferences. The buyer's country determines [international pricing](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/markets/international-pricing) and should match their shipping address.
   *
   * Use this mutation to associate a logged-in customer via access token, set a B2B company location, or configure checkout preferences like delivery method. Preferences prefill checkout fields but don't sync back to the cart if overwritten at checkout.
   *
   */
  cartBuyerIdentityUpdate?: Maybe<CartBuyerIdentityUpdatePayload>;
  /** Creates a clone of the specified cart with all personally identifiable information removed. */
  cartClone?: Maybe<CartClonePayload>;
  /**
   * Creates a new [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart) for a buyer session. You can optionally initialize the cart with merchandise lines, discount codes, gift card codes, buyer identity for international pricing, and custom attributes.
   *
   * The returned cart includes a `checkoutUrl` that directs the buyer to complete their purchase.
   *
   */
  cartCreate?: Maybe<CartCreatePayload>;
  /**
   * Adds delivery addresses to a [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart). A cart can have up to 20 delivery addresses. One address can be marked as selected for checkout, and addresses can optionally be marked as one-time use so they aren't saved to the customer's account.
   *
   */
  cartDeliveryAddressesAdd?: Maybe<CartDeliveryAddressesAddPayload>;
  /**
   * Removes delivery addresses from a [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart) by their IDs, allowing batch removal in a single request.
   *
   */
  cartDeliveryAddressesRemove?: Maybe<CartDeliveryAddressesRemovePayload>;
  /**
   * Replaces all delivery addresses on a [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart) with a new set of addresses in a single operation. Unlike [`cartDeliveryAddressesUpdate`](https://shopify.dev/docs/api/storefront/current/mutations/cartDeliveryAddressesUpdate), which modifies existing addresses, this mutation removes all current addresses and sets the provided list as the new delivery addresses.
   *
   * One address can be marked as selected, and each address can be flagged for one-time use or configured with a specific validation strategy.
   *
   */
  cartDeliveryAddressesReplace?: Maybe<CartDeliveryAddressesReplacePayload>;
  /**
   * Updates one or more delivery addresses on a [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart). Each address can be modified to change its details, set it as the pre-selected address for checkout, or mark it for one-time use so it isn't saved to the customer's account.
   *
   */
  cartDeliveryAddressesUpdate?: Maybe<CartDeliveryAddressesUpdatePayload>;
  /**
   * Updates the discount codes applied to a [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart). This mutation replaces all existing discount codes with the provided list, so pass an empty array to remove all codes. Discount codes are case-insensitive.
   *
   * After updating, check each [`CartDiscountCode`](https://shopify.dev/docs/api/storefront/current/objects/CartDiscountCode) in the cart's [`discountCodes`](https://shopify.dev/docs/api/storefront/current/objects/Cart#field-Cart.fields.discountCodes) field to see whether the code is applicable to the cart's current contents.
   *
   */
  cartDiscountCodesUpdate?: Maybe<CartDiscountCodesUpdatePayload>;
  /**
   * Adds gift card codes to a [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart) without replacing any codes already applied. Gift card codes are case-insensitive.
   *
   * To replace all gift card codes instead of adding to them, use [`cartGiftCardCodesUpdate`](https://shopify.dev/docs/api/storefront/current/mutations/cartGiftCardCodesUpdate).
   *
   */
  cartGiftCardCodesAdd?: Maybe<CartGiftCardCodesAddPayload>;
  /**
   * Removes gift cards from a [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart) using their IDs. You can retrieve the IDs of applied gift cards from the cart's [`appliedGiftCards`](https://shopify.dev/docs/api/storefront/current/objects/Cart#field-Cart.fields.appliedGiftCards) field.
   *
   */
  cartGiftCardCodesRemove?: Maybe<CartGiftCardCodesRemovePayload>;
  /**
   * Updates the gift card codes applied to the cart. Unlike [`cartGiftCardCodesAdd`](https://shopify.dev/docs/api/storefront/current/mutations/cartGiftCardCodesAdd), which adds codes without replacing existing ones, this mutation sets the gift card codes for the cart. Gift card codes are case-insensitive.
   *
   */
  cartGiftCardCodesUpdate?: Maybe<CartGiftCardCodesUpdatePayload>;
  /**
   * Adds one or more merchandise lines to an existing [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart). Each line specifies the [product variant](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant) to purchase. Quantity defaults to `1` if not provided.
   *
   * You can add up to 250 lines in a single request. Use [`CartLineInput`](https://shopify.dev/docs/api/storefront/current/input-objects/CartLineInput) to configure each line's merchandise, quantity, selling plan, custom attributes, and any parent relationships for nested line items such as warranties or add-ons.
   *
   */
  cartLinesAdd?: Maybe<CartLinesAddPayload>;
  /**
   * Removes one or more merchandise lines from a [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart). Accepts up to 250 line IDs per request. Returns the updated cart along with any errors or warnings.
   *
   */
  cartLinesRemove?: Maybe<CartLinesRemovePayload>;
  /**
   * Updates one or more merchandise lines on a [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart). You can modify the quantity, swap the merchandise, change custom attributes, or update the selling plan for each line. You can update a maximum of 250 lines per request.
   *
   * Omitting the [`attributes`](https://shopify.dev/docs/api/storefront/current/mutations/cartLinesUpdate#arguments-lines.fields.attributes) field or setting it to null preserves existing line attributes. Pass an empty array to clear all attributes from a line.
   *
   */
  cartLinesUpdate?: Maybe<CartLinesUpdatePayload>;
  /**
   * Deletes a cart metafield.
   *
   * > Note:
   * > This mutation won't trigger [Shopify Functions](https://shopify.dev/docs/api/functions). The changes won't be available to Shopify Functions until the buyer goes to checkout or performs another cart interaction that triggers the functions.
   *
   */
  cartMetafieldDelete?: Maybe<CartMetafieldDeletePayload>;
  /**
   * Sets [`Metafield`](https://shopify.dev/docs/api/storefront/current/objects/Metafield) values on a cart, creating new metafields or updating existing ones. Accepts up to 25 metafields per request.
   *
   * Cart metafields can automatically copy to order metafields when an order is created, if there's a matching order metafield definition with the [cart to order copyable](https://shopify.dev/docs/apps/build/metafields/use-metafield-capabilities#cart-to-order-copyable) capability enabled.
   *
   * > Note:
   * > This mutation doesn't trigger [Shopify Functions](https://shopify.dev/docs/api/functions). Changes aren't available to Shopify Functions until the buyer goes to checkout or performs another cart interaction that triggers the functions.
   *
   */
  cartMetafieldsSet?: Maybe<CartMetafieldsSetPayload>;
  /**
   * Updates the note on a [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart). The note is a text field that stores additional information, such as a personalized message from the buyer or special instructions for the order.
   *
   */
  cartNoteUpdate?: Maybe<CartNoteUpdatePayload>;
  /** Update the customer's payment method that will be used to checkout. */
  cartPaymentUpdate?: Maybe<CartPaymentUpdatePayload>;
  /** Prepare the cart for cart checkout completion. */
  cartPrepareForCompletion?: Maybe<CartPrepareForCompletionPayload>;
  /** Removes personally identifiable information from the cart. */
  cartRemovePersonalData?: Maybe<CartRemovePersonalDataPayload>;
  /**
   * Updates the selected delivery option for one or more [`CartDeliveryGroup`](https://shopify.dev/docs/api/storefront/current/objects/CartDeliveryGroup) objects in a cart. Each delivery group represents items shipping to a specific address and offers multiple delivery options with different costs and methods.
   *
   * Use this mutation when a customer chooses their preferred shipping method during checkout. The [`deliveryOptionHandle`](https://shopify.dev/docs/api/storefront/current/input-objects/CartSelectedDeliveryOptionInput#field-CartSelectedDeliveryOptionInput.fields.deliveryOptionHandle) identifies which [`CartDeliveryOption`](https://shopify.dev/docs/api/storefront/current/objects/CartDeliveryOption) to select for each delivery group.
   *
   */
  cartSelectedDeliveryOptionsUpdate?: Maybe<CartSelectedDeliveryOptionsUpdatePayload>;
  /** Submit the cart for checkout completion. */
  cartSubmitForCompletion?: Maybe<CartSubmitForCompletionPayload>;
  /**
   * For legacy customer accounts only.
   *
   * Creates a [`CustomerAccessToken`](https://shopify.dev/docs/api/storefront/current/objects/CustomerAccessToken) using the customer's email and password. The access token is required to read or modify the [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer) object, such as updating account information or managing addresses.
   *
   * The token has an expiration time. Use [`customerAccessTokenRenew`](https://shopify.dev/docs/api/storefront/current/mutations/customerAccessTokenRenew) to extend the token before it expires, or create a new token if it's already expired.
   *
   * > Caution:
   * > This mutation handles customer credentials. Always transmit requests over HTTPS and never log or expose the password.
   *
   */
  customerAccessTokenCreate?: Maybe<CustomerAccessTokenCreatePayload>;
  /**
   * Creates a [`CustomerAccessToken`](https://shopify.dev/docs/api/storefront/current/objects/CustomerAccessToken) using a [multipass token](https://shopify.dev/docs/api/multipass) instead of email and password. This enables single sign-on for customers who authenticate through an external system.
   *
   * If the customer doesn't exist in Shopify, then a new customer record is created automatically. If the customer exists but the record is disabled, then the customer record is re-enabled.
   *
   * > Caution:
   * > Multipass tokens are only valid for 15 minutes and can only be used once. Generate tokens on-the-fly when needed rather than in advance.
   *
   */
  customerAccessTokenCreateWithMultipass?: Maybe<CustomerAccessTokenCreateWithMultipassPayload>;
  /**
   * Permanently destroys a [`CustomerAccessToken`](https://shopify.dev/docs/api/storefront/current/objects/CustomerAccessToken). Use this mutation when a customer explicitly signs out or when you need to revoke the token. Use [`customerAccessTokenCreate`](https://shopify.dev/docs/api/storefront/current/mutations/customerAccessTokenCreate) to generate a new token with the customer's credentials.
   *
   * > Caution:
   * > This action is irreversible. The customer needs to sign in again to obtain a new access token.
   *
   */
  customerAccessTokenDelete?: Maybe<CustomerAccessTokenDeletePayload>;
  /**
   * Extends the validity of a [`CustomerAccessToken`](https://shopify.dev/docs/api/storefront/current/objects/CustomerAccessToken) before it expires. The renewed token maintains authenticated access to customer operations.
   *
   * Renewal must happen before the token's [`expiresAt`](https://shopify.dev/docs/api/storefront/current/objects/CustomerAccessToken#field-CustomerAccessToken.fields.expiresAt) time. If a token has already expired, then use [`customerAccessTokenCreate`](https://shopify.dev/docs/api/storefront/current/mutations/customerAccessTokenCreate) to generate a new token with the customer's credentials.
   *
   * > Caution:
   * > Store access tokens securely. Never store tokens in plain text or insecure locations, and avoid exposing them in URLs or logs.
   *
   */
  customerAccessTokenRenew?: Maybe<CustomerAccessTokenRenewPayload>;
  /**
   * Activates a customer account using an activation token received from the [`customerCreate`](https://shopify.dev/docs/api/storefront/current/mutations/customerCreate) mutation. The customer sets their password during activation and receives a [`CustomerAccessToken`](https://shopify.dev/docs/api/storefront/current/objects/CustomerAccessToken) for authenticated access.
   *
   * For a simpler approach that doesn't require parsing the activation URL, use [`customerActivateByUrl`](https://shopify.dev/docs/api/storefront/current/mutations/customerActivateByUrl) instead.
   *
   * > Caution:
   * > This mutation handles customer credentials. Always use HTTPS and never log or expose the password or access token.
   *
   */
  customerActivate?: Maybe<CustomerActivatePayload>;
  /**
   * Activates a customer account using the full activation URL from the [`customerCreate`](https://shopify.dev/docs/api/storefront/current/mutations/customerCreate) mutation. This approach simplifies activation by accepting the complete URL directly, eliminating the need to parse it for the customer ID and activation token. Returns a [`CustomerAccessToken`](https://shopify.dev/docs/api/storefront/current/objects/CustomerAccessToken) for authenticating subsequent requests.
   *
   * > Caution:
   * > Store the returned access token securely. It grants access to the customer's account data.
   *
   */
  customerActivateByUrl?: Maybe<CustomerActivateByUrlPayload>;
  /**
   * Creates a new [`MailingAddress`](https://shopify.dev/docs/api/storefront/current/objects/MailingAddress) for a [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer). Use the customer's [access token](https://shopify.dev/docs/api/storefront/current/mutations/customerAddressCreate#arguments-customerAccessToken) to identify them. Successful creation returns the new address.
   *
   * Each customer can have multiple addresses.
   *
   */
  customerAddressCreate?: Maybe<CustomerAddressCreatePayload>;
  /**
   * Permanently deletes a specific [`MailingAddress`](https://shopify.dev/docs/api/storefront/current/objects/MailingAddress) for a [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer). Requires a valid [customer access token](https://shopify.dev/docs/api/storefront/current/mutations/customerAddressDelete#arguments-customerAccessToken) to authenticate the request.
   *
   * > Caution:
   * > This action is irreversible. You can't recover the deleted address.
   *
   */
  customerAddressDelete?: Maybe<CustomerAddressDeletePayload>;
  /**
   * Updates an existing [`MailingAddress`](https://shopify.dev/docs/api/storefront/current/objects/MailingAddress) for a [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer). Requires a [customer access token](https://shopify.dev/docs/api/storefront/current/mutations/customerAddressUpdate#arguments-customerAccessToken) to identify the customer, an ID to specify which address to modify, and an [`address`](https://shopify.dev/docs/api/storefront/current/input-objects/MailingAddressInput) with the updated fields.
   *
   * Successful update returns the updated [`MailingAddress`](https://shopify.dev/docs/api/storefront/current/objects/MailingAddress).
   *
   */
  customerAddressUpdate?: Maybe<CustomerAddressUpdatePayload>;
  /**
   * Creates a new [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer) account with the provided contact information and login credentials. The customer can then sign in for things such as accessing their account, viewing order history, and managing saved addresses.
   *
   * > Caution:
   * > This mutation creates customer credentials. Ensure passwords are collected securely and never logged or exposed in client-side code.
   *
   */
  customerCreate?: Maybe<CustomerCreatePayload>;
  /**
   * Updates the default address of an existing [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer). Requires a [customer access token](https://shopify.dev/docs/api/storefront/current/mutations/customerDefaultAddressUpdate#arguments-customerAccessToken) to identify the customer and an address ID to specify which address to set as the new default.
   *
   */
  customerDefaultAddressUpdate?: Maybe<CustomerDefaultAddressUpdatePayload>;
  /**
   * Sends a reset password email to the customer. The email contains a reset password URL and token that you can pass to the [`customerResetByUrl`](https://shopify.dev/docs/api/storefront/current/mutations/customerResetByUrl) or [`customerReset`](https://shopify.dev/docs/api/storefront/current/mutations/customerReset) mutation to reset the customer's password.
   *
   * This mutation is throttled by IP. With private access, you can provide a [`Shopify-Storefront-Buyer-IP` header](https://shopify.dev/docs/api/usage/authentication#optional-ip-header) instead of the request IP. The header is case-sensitive.
   *
   * > Caution:
   * > Ensure the value provided to `Shopify-Storefront-Buyer-IP` is trusted. Unthrottled access to this mutation presents a security risk.
   *
   */
  customerRecover?: Maybe<CustomerRecoverPayload>;
  /**
   * Resets a customer's password using the reset token from a password recovery email. On success, returns the updated [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer) and a new [`CustomerAccessToken`](https://shopify.dev/docs/api/storefront/current/objects/CustomerAccessToken) for immediate authentication.
   *
   * Use the [`customerRecover`](https://shopify.dev/docs/api/storefront/current/mutations/customerRecover) mutation to send the password recovery email that provides the reset token. Alternatively, use [`customerResetByUrl`](https://shopify.dev/docs/api/storefront/current/mutations/customerResetByUrl) if you have the full reset URL instead of the customer ID and token.
   *
   * > Caution:
   * > This mutation handles sensitive customer credentials. Validate password requirements on the client before submission.
   *
   */
  customerReset?: Maybe<CustomerResetPayload>;
  /**
   * Resets a customer's password using the reset URL from a password recovery email. The reset URL is generated by the [`customerRecover`](https://shopify.dev/docs/api/storefront/current/mutations/customerRecover) mutation.
   *
   * On success, returns the updated [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer) and a new [`CustomerAccessToken`](https://shopify.dev/docs/api/storefront/current/objects/CustomerAccessToken) for immediate authentication.
   *
   * > Caution:
   * > This mutation handles customer credentials. Ensure the new password is transmitted securely and never logged or exposed in client-side code.
   *
   */
  customerResetByUrl?: Maybe<CustomerResetByUrlPayload>;
  /**
   * Updates a [customer's](https://shopify.dev/docs/api/storefront/current/objects/Customer) personal information such as name, password, and marketing preferences. Requires a valid [`CustomerAccessToken`](https://shopify.dev/docs/api/storefront/current/objects/CustomerAccessToken) to authenticate the customer making the update.
   *
   * If the customer's password is updated, then all previous access tokens become invalid. The mutation returns a new access token in the payload to maintain the customer's session.
   *
   * > Caution:
   * > Password changes invalidate all existing access tokens. Ensure your app handles the new token returned in the response to avoid logging the customer out.
   *
   */
  customerUpdate?: Maybe<CustomerUpdatePayload>;
  /**
   * Creates a [Shop Pay payment request session](https://shopify.dev/docs/api/storefront/current/objects/ShopPayPaymentRequestSession) for processing payments. The session includes a checkout URL where customers complete their purchase and a token for subsequent operations like submitting the payment.
   *
   * The `sourceIdentifier` must be unique across all orders to ensure accurate reconciliation.
   *
   * For a complete integration guide including the JavaScript SDK setup and checkout flow, refer to the [Shop Component API documentation](https://shopify.dev/docs/api/commerce-components/pay). For implementation steps, see the [development journey guide](https://shopify.dev/docs/api/commerce-components/pay/development-journey). For common error scenarios, see the [troubleshooting guide](https://shopify.dev/docs/api/commerce-components/pay/troubleshooting-guide).
   *
   */
  shopPayPaymentRequestSessionCreate?: Maybe<ShopPayPaymentRequestSessionCreatePayload>;
  /**
   * Finalizes a [Shop Pay payment request session](https://shopify.dev/docs/api/storefront/current/objects/ShopPayPaymentRequestSession). Call this mutation after creating a session with [`shopPayPaymentRequestSessionCreate`](https://shopify.dev/docs/api/storefront/current/mutations/shopPayPaymentRequestSessionCreate).
   *
   * The [`idempotencyKey`](https://shopify.dev/docs/api/storefront/current/mutations/shopPayPaymentRequestSessionSubmit#arguments-idempotencyKey) argument ensures the payment transaction occurs only once, preventing duplicate charges. On success, returns a [`ShopPayPaymentRequestReceipt`](https://shopify.dev/docs/api/storefront/current/objects/ShopPayPaymentRequestReceipt) with the processing status and a receipt token.
   *
   * For a complete integration guide including the JavaScript SDK setup and checkout flow, refer to the [Shop Component API documentation](https://shopify.dev/docs/api/commerce-components/pay). For implementation steps, see the [development journey guide](https://shopify.dev/docs/api/commerce-components/pay/development-journey). For common error scenarios, see the [troubleshooting guide](https://shopify.dev/docs/api/commerce-components/pay/troubleshooting-guide).
   *
   */
  shopPayPaymentRequestSessionSubmit?: Maybe<ShopPayPaymentRequestSessionSubmitPayload>;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartAttributesUpdateArgs = {
  attributes: Array<AttributeInput>;
  cartId: Scalars['ID']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartBillingAddressUpdateArgs = {
  billingAddress?: InputMaybe<MailingAddressInput>;
  cartId: Scalars['ID']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartBuyerIdentityUpdateArgs = {
  buyerIdentity: CartBuyerIdentityInput;
  cartId: Scalars['ID']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartCloneArgs = {
  cartId: Scalars['ID']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartCreateArgs = {
  input?: InputMaybe<CartInput>;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartDeliveryAddressesAddArgs = {
  addresses: Array<CartSelectableAddressInput>;
  cartId: Scalars['ID']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartDeliveryAddressesRemoveArgs = {
  addressIds: Array<Scalars['ID']['input']>;
  cartId: Scalars['ID']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartDeliveryAddressesReplaceArgs = {
  addresses: Array<CartSelectableAddressInput>;
  cartId: Scalars['ID']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartDeliveryAddressesUpdateArgs = {
  addresses: Array<CartSelectableAddressUpdateInput>;
  cartId: Scalars['ID']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartDiscountCodesUpdateArgs = {
  cartId: Scalars['ID']['input'];
  discountCodes: Array<Scalars['String']['input']>;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartGiftCardCodesAddArgs = {
  cartId: Scalars['ID']['input'];
  giftCardCodes: Array<Scalars['String']['input']>;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartGiftCardCodesRemoveArgs = {
  appliedGiftCardIds: Array<Scalars['ID']['input']>;
  cartId: Scalars['ID']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartGiftCardCodesUpdateArgs = {
  cartId: Scalars['ID']['input'];
  giftCardCodes: Array<Scalars['String']['input']>;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartLinesAddArgs = {
  cartId: Scalars['ID']['input'];
  lines: Array<CartLineInput>;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartLinesRemoveArgs = {
  cartId: Scalars['ID']['input'];
  lineIds: Array<Scalars['ID']['input']>;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartLinesUpdateArgs = {
  cartId: Scalars['ID']['input'];
  lines: Array<CartLineUpdateInput>;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartMetafieldDeleteArgs = {
  input: CartMetafieldDeleteInput;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartMetafieldsSetArgs = {
  metafields: Array<CartMetafieldsSetInput>;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartNoteUpdateArgs = {
  cartId: Scalars['ID']['input'];
  note: Scalars['String']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartPaymentUpdateArgs = {
  cartId: Scalars['ID']['input'];
  payment: CartPaymentInput;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartPrepareForCompletionArgs = {
  cartId: Scalars['ID']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartRemovePersonalDataArgs = {
  cartId: Scalars['ID']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartSelectedDeliveryOptionsUpdateArgs = {
  cartId: Scalars['ID']['input'];
  selectedDeliveryOptions: Array<CartSelectedDeliveryOptionInput>;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCartSubmitForCompletionArgs = {
  attemptToken: Scalars['String']['input'];
  cartId: Scalars['ID']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCustomerAccessTokenCreateArgs = {
  input: CustomerAccessTokenCreateInput;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCustomerAccessTokenCreateWithMultipassArgs = {
  multipassToken: Scalars['String']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCustomerAccessTokenDeleteArgs = {
  customerAccessToken: Scalars['String']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCustomerAccessTokenRenewArgs = {
  customerAccessToken: Scalars['String']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCustomerActivateArgs = {
  id: Scalars['ID']['input'];
  input: CustomerActivateInput;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCustomerActivateByUrlArgs = {
  activationUrl: Scalars['URL']['input'];
  password: Scalars['String']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCustomerAddressCreateArgs = {
  address: MailingAddressInput;
  customerAccessToken: Scalars['String']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCustomerAddressDeleteArgs = {
  customerAccessToken: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCustomerAddressUpdateArgs = {
  address: MailingAddressInput;
  customerAccessToken: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCustomerCreateArgs = {
  input: CustomerCreateInput;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCustomerDefaultAddressUpdateArgs = {
  addressId: Scalars['ID']['input'];
  customerAccessToken: Scalars['String']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCustomerRecoverArgs = {
  email: Scalars['String']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCustomerResetArgs = {
  id: Scalars['ID']['input'];
  input: CustomerResetInput;
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCustomerResetByUrlArgs = {
  password: Scalars['String']['input'];
  resetUrl: Scalars['URL']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationCustomerUpdateArgs = {
  customer: CustomerUpdateInput;
  customerAccessToken: Scalars['String']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationShopPayPaymentRequestSessionCreateArgs = {
  paymentRequest: ShopPayPaymentRequestInput;
  sourceIdentifier: Scalars['String']['input'];
};

/** The schema’s entry-point for mutations. This acts as the public, top-level API from which all mutation queries must start. */
export type MutationShopPayPaymentRequestSessionSubmitArgs = {
  idempotencyKey: Scalars['String']['input'];
  orderName?: InputMaybe<Scalars['String']['input']>;
  paymentRequest: ShopPayPaymentRequestInput;
  token: Scalars['String']['input'];
};

/**
 * Enables global object identification following the [Relay specification](https://relay.dev/graphql/objectidentification.htm#sec-Node-Interface). Any type implementing this interface has a globally-unique `id` field and can be fetched directly using the [`node`](https://shopify.dev/docs/api/storefront/current/queries/node) or [`nodes`](https://shopify.dev/docs/api/storefront/current/queries/nodes) queries.
 *
 */
export type Node = {
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
};

/** Represents a resource that can be published to the Online Store sales channel. */
export type OnlineStorePublishable = {
  /** The URL used for viewing the resource on the shop's Online Store. Returns `null` if the resource is currently not published to the Online Store sales channel. */
  onlineStoreUrl?: Maybe<Scalars['URL']['output']>;
};

/** An order is a customer’s completed request to purchase one or more products from a shop. An order is created when a customer completes the checkout process, during which time they provides an email address, billing address and payment information. */
export type Order = HasMetafields &
  Node & {
    __typename?: 'Order';
    /** The address associated with the payment method. */
    billingAddress?: Maybe<MailingAddress>;
    /** The reason for the order's cancellation. Returns `null` if the order wasn't canceled. */
    cancelReason?: Maybe<OrderCancelReason>;
    /** The date and time when the order was canceled. Returns null if the order wasn't canceled. */
    canceledAt?: Maybe<Scalars['DateTime']['output']>;
    /** The code of the currency used for the payment. */
    currencyCode: CurrencyCode;
    /** The subtotal of line items and their discounts, excluding line items that have been removed. Does not contain order-level discounts, duties, shipping costs, or shipping discounts. Taxes aren't included unless the order is a taxes-included order. */
    currentSubtotalPrice: MoneyV2;
    /** The total cost of duties for the order, including refunds. */
    currentTotalDuties?: Maybe<MoneyV2>;
    /** The total amount of the order, including duties, taxes and discounts, minus amounts for line items that have been removed. */
    currentTotalPrice: MoneyV2;
    /** The total cost of shipping, excluding shipping lines that have been refunded or removed. Taxes aren't included unless the order is a taxes-included order. */
    currentTotalShippingPrice: MoneyV2;
    /** The total of all taxes applied to the order, excluding taxes for returned line items. */
    currentTotalTax: MoneyV2;
    /** A list of the custom attributes added to the order. For example, whether an order is a customer's first. */
    customAttributes: Array<Attribute>;
    /** The locale code in which this specific order happened. */
    customerLocale?: Maybe<Scalars['String']['output']>;
    /** The unique URL that the customer can use to access the order. */
    customerUrl?: Maybe<Scalars['URL']['output']>;
    /** Discounts that have been applied on the order. */
    discountApplications: DiscountApplicationConnection;
    /** Whether the order has had any edits applied or not. */
    edited: Scalars['Boolean']['output'];
    /** The customer's email address. */
    email?: Maybe<Scalars['String']['output']>;
    /** The financial status of the order. */
    financialStatus?: Maybe<OrderFinancialStatus>;
    /** The fulfillment status for the order. */
    fulfillmentStatus: OrderFulfillmentStatus;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** List of the order’s line items. */
    lineItems: OrderLineItemConnection;
    /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
    metafield?: Maybe<Metafield>;
    /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
    metafields: Array<Maybe<Metafield>>;
    /**
     * Unique identifier for the order that appears on the order.
     * For example, _#1000_ or _Store1001.
     *
     */
    name: Scalars['String']['output'];
    /** A unique numeric identifier for the order for use by shop owner and customer. */
    orderNumber: Scalars['Int']['output'];
    /** The total cost of duties charged at checkout. */
    originalTotalDuties?: Maybe<MoneyV2>;
    /** The total price of the order before any applied edits. */
    originalTotalPrice: MoneyV2;
    /** The customer's phone number for receiving SMS notifications. */
    phone?: Maybe<Scalars['String']['output']>;
    /**
     * The date and time when the order was imported.
     * This value can be set to dates in the past when importing from other systems.
     * If no value is provided, it will be auto-generated based on current date and time.
     *
     */
    processedAt: Scalars['DateTime']['output'];
    /** The address to where the order will be shipped. */
    shippingAddress?: Maybe<MailingAddress>;
    /**
     * The discounts that have been allocated onto the shipping line by discount applications.
     *
     */
    shippingDiscountAllocations: Array<DiscountAllocation>;
    /** The unique URL for the order's status page. */
    statusUrl: Scalars['URL']['output'];
    /** Price of the order before shipping and taxes. */
    subtotalPrice?: Maybe<MoneyV2>;
    /**
     * Price of the order before duties, shipping and taxes.
     * @deprecated Use `subtotalPrice` instead.
     */
    subtotalPriceV2?: Maybe<MoneyV2>;
    /** List of the order’s successful fulfillments. */
    successfulFulfillments?: Maybe<Array<Fulfillment>>;
    /** The sum of all the prices of all the items in the order, duties, taxes and discounts included (must be positive). */
    totalPrice: MoneyV2;
    /**
     * The sum of all the prices of all the items in the order, duties, taxes and discounts included (must be positive).
     * @deprecated Use `totalPrice` instead.
     */
    totalPriceV2: MoneyV2;
    /** The total amount that has been refunded. */
    totalRefunded: MoneyV2;
    /**
     * The total amount that has been refunded.
     * @deprecated Use `totalRefunded` instead.
     */
    totalRefundedV2: MoneyV2;
    /** The total cost of shipping. */
    totalShippingPrice: MoneyV2;
    /**
     * The total cost of shipping.
     * @deprecated Use `totalShippingPrice` instead.
     */
    totalShippingPriceV2: MoneyV2;
    /** The total cost of taxes. */
    totalTax?: Maybe<MoneyV2>;
    /**
     * The total cost of taxes.
     * @deprecated Use `totalTax` instead.
     */
    totalTaxV2?: Maybe<MoneyV2>;
  };

/** An order is a customer’s completed request to purchase one or more products from a shop. An order is created when a customer completes the checkout process, during which time they provides an email address, billing address and payment information. */
export type OrderDiscountApplicationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** An order is a customer’s completed request to purchase one or more products from a shop. An order is created when a customer completes the checkout process, during which time they provides an email address, billing address and payment information. */
export type OrderLineItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/** An order is a customer’s completed request to purchase one or more products from a shop. An order is created when a customer completes the checkout process, during which time they provides an email address, billing address and payment information. */
export type OrderMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/** An order is a customer’s completed request to purchase one or more products from a shop. An order is created when a customer completes the checkout process, during which time they provides an email address, billing address and payment information. */
export type OrderMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/** An order is a customer’s completed request to purchase one or more products from a shop. An order is created when a customer completes the checkout process, during which time they provides an email address, billing address and payment information. */
export type OrderSuccessfulFulfillmentsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};

/** Represents the reason for the order's cancellation. */
export type OrderCancelReason =
  /** The customer wanted to cancel the order. */
  | 'CUSTOMER'
  /** Payment was declined. */
  | 'DECLINED'
  /** The order was fraudulent. */
  | 'FRAUD'
  /** There was insufficient inventory. */
  | 'INVENTORY'
  /** The order was canceled for an unlisted reason. */
  | 'OTHER'
  /** Staff made an error. */
  | 'STAFF';

/**
 * An auto-generated type for paginating through multiple Orders.
 *
 */
export type OrderConnection = {
  __typename?: 'OrderConnection';
  /** A list of edges. */
  edges: Array<OrderEdge>;
  /** A list of the nodes contained in OrderEdge. */
  nodes: Array<Order>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total count of Orders. */
  totalCount: Scalars['UnsignedInt64']['output'];
};

/**
 * An auto-generated type which holds one Order and a cursor during pagination.
 *
 */
export type OrderEdge = {
  __typename?: 'OrderEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of OrderEdge. */
  node: Order;
};

/** Represents the order's current financial status. */
export type OrderFinancialStatus =
  /** Displayed as **Authorized**. */
  | 'AUTHORIZED'
  /** Displayed as **Paid**. */
  | 'PAID'
  /** Displayed as **Partially paid**. */
  | 'PARTIALLY_PAID'
  /** Displayed as **Partially refunded**. */
  | 'PARTIALLY_REFUNDED'
  /** Displayed as **Pending**. */
  | 'PENDING'
  /** Displayed as **Refunded**. */
  | 'REFUNDED'
  /** Displayed as **Voided**. */
  | 'VOIDED';

/**
 * The aggregated fulfillment status of an [`Order`](https://shopify.dev/docs/api/storefront/current/objects/Order), summarizing the state of all line items. Used for display purposes.
 *
 * Statuses range from unfulfilled to fully fulfilled, with intermediate states such as in progress and on hold.
 *
 * Learn more about [order statuses](https://help.shopify.com/manual/fulfillment/managing-orders/order-status).
 *
 */
export type OrderFulfillmentStatus =
  /** Displayed as **Fulfilled**. All of the items in the order have been fulfilled. */
  | 'FULFILLED'
  /** Displayed as **In progress**. Some of the items in the order have been fulfilled, or a request for fulfillment has been sent to the fulfillment service. */
  | 'IN_PROGRESS'
  /** Displayed as **On hold**. All of the unfulfilled items in this order are on hold. */
  | 'ON_HOLD'
  /** Displayed as **Open**. None of the items in the order have been fulfilled. Replaced by "UNFULFILLED" status. */
  | 'OPEN'
  /** Displayed as **Partially fulfilled**. Some of the items in the order have been fulfilled. */
  | 'PARTIALLY_FULFILLED'
  /** Displayed as **Pending fulfillment**. A request for fulfillment of some items awaits a response from the fulfillment service. Replaced by "IN_PROGRESS" status. */
  | 'PENDING_FULFILLMENT'
  /** Displayed as **Restocked**. All of the items in the order have been restocked. Replaced by "UNFULFILLED" status. */
  | 'RESTOCKED'
  /** Displayed as **Scheduled**. All of the unfulfilled items in this order are scheduled for fulfillment at later time. */
  | 'SCHEDULED'
  /** Displayed as **Unfulfilled**. None of the items in the order have been fulfilled. */
  | 'UNFULFILLED';

/** Represents a single line in an order. There is one line item for each distinct product variant. */
export type OrderLineItem = {
  __typename?: 'OrderLineItem';
  /** The number of entries associated to the line item minus the items that have been removed. */
  currentQuantity: Scalars['Int']['output'];
  /** List of custom attributes associated to the line item. */
  customAttributes: Array<Attribute>;
  /** The discounts that have been allocated onto the order line item by discount applications. */
  discountAllocations: Array<DiscountAllocation>;
  /** The total price of the line item, including discounts, and displayed in the presentment currency. */
  discountedTotalPrice: MoneyV2;
  /** The total price of the line item, not including any discounts. The total price is calculated using the original unit price multiplied by the quantity, and it's displayed in the presentment currency. */
  originalTotalPrice: MoneyV2;
  /** The number of products variants associated to the line item. */
  quantity: Scalars['Int']['output'];
  /** The title of the product combined with title of the variant. */
  title: Scalars['String']['output'];
  /** The product variant object associated to the line item. */
  variant?: Maybe<ProductVariant>;
};

/**
 * An auto-generated type for paginating through multiple OrderLineItems.
 *
 */
export type OrderLineItemConnection = {
  __typename?: 'OrderLineItemConnection';
  /** A list of edges. */
  edges: Array<OrderLineItemEdge>;
  /** A list of the nodes contained in OrderLineItemEdge. */
  nodes: Array<OrderLineItem>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one OrderLineItem and a cursor during pagination.
 *
 */
export type OrderLineItemEdge = {
  __typename?: 'OrderLineItemEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of OrderLineItemEdge. */
  node: OrderLineItem;
};

/** The set of valid sort keys for the Order query. */
export type OrderSortKeys =
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `processed_at` value. */
  | 'PROCESSED_AT'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `total_price` value. */
  | 'TOTAL_PRICE';

/**
 * A [custom content page](https://help.shopify.com/manual/online-store/add-edit-pages) on a merchant's store. Pages display HTML-formatted content, such as "About Us", contact details, or store policies.
 *
 * Each page has a unique [`handle`](https://shopify.dev/docs/api/storefront/current/objects/Page#field-Page.fields.handle) for URL routing and includes [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) information for search engine optimization. Pages support [`Metafield`](https://shopify.dev/docs/api/storefront/current/objects/Metafield) attachments for storing additional custom data.
 *
 */
export type Page = HasMetafields &
  Node &
  OnlineStorePublishable &
  Trackable & {
    __typename?: 'Page';
    /** The description of the page, complete with HTML formatting. */
    body: Scalars['HTML']['output'];
    /** Summary of the page body. */
    bodySummary: Scalars['String']['output'];
    /** The timestamp of the page creation. */
    createdAt: Scalars['DateTime']['output'];
    /** A human-friendly unique string for the page automatically generated from its title. */
    handle: Scalars['String']['output'];
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
    metafield?: Maybe<Metafield>;
    /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
    metafields: Array<Maybe<Metafield>>;
    /** The URL used for viewing the resource on the shop's Online Store. Returns `null` if the resource is currently not published to the Online Store sales channel. */
    onlineStoreUrl?: Maybe<Scalars['URL']['output']>;
    /** The page's SEO information. */
    seo?: Maybe<Seo>;
    /** The title of the page. */
    title: Scalars['String']['output'];
    /** URL parameters to be added to a page URL to track the origin of on-site search traffic for [analytics reporting](https://help.shopify.com/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports). Returns a result when accessed through the [search](https://shopify.dev/docs/api/storefront/current/queries/search) or [predictiveSearch](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries, otherwise returns null. */
    trackingParameters?: Maybe<Scalars['String']['output']>;
    /** The timestamp of the latest page update. */
    updatedAt: Scalars['DateTime']['output'];
  };

/**
 * A [custom content page](https://help.shopify.com/manual/online-store/add-edit-pages) on a merchant's store. Pages display HTML-formatted content, such as "About Us", contact details, or store policies.
 *
 * Each page has a unique [`handle`](https://shopify.dev/docs/api/storefront/current/objects/Page#field-Page.fields.handle) for URL routing and includes [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) information for search engine optimization. Pages support [`Metafield`](https://shopify.dev/docs/api/storefront/current/objects/Metafield) attachments for storing additional custom data.
 *
 */
export type PageMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * A [custom content page](https://help.shopify.com/manual/online-store/add-edit-pages) on a merchant's store. Pages display HTML-formatted content, such as "About Us", contact details, or store policies.
 *
 * Each page has a unique [`handle`](https://shopify.dev/docs/api/storefront/current/objects/Page#field-Page.fields.handle) for URL routing and includes [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) information for search engine optimization. Pages support [`Metafield`](https://shopify.dev/docs/api/storefront/current/objects/Metafield) attachments for storing additional custom data.
 *
 */
export type PageMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/**
 * An auto-generated type for paginating through multiple Pages.
 *
 */
export type PageConnection = {
  __typename?: 'PageConnection';
  /** A list of edges. */
  edges: Array<PageEdge>;
  /** A list of the nodes contained in PageEdge. */
  nodes: Array<Page>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one Page and a cursor during pagination.
 *
 */
export type PageEdge = {
  __typename?: 'PageEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of PageEdge. */
  node: Page;
};

/**
 * Returns information about pagination in a connection, in accordance with the
 * [Relay specification](https://relay.dev/graphql/connections.htm#sec-undefined.PageInfo).
 * For more information, please read our [GraphQL Pagination Usage Guide](https://shopify.dev/api/usage/pagination-graphql).
 *
 */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** The cursor corresponding to the last node in edges. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether there are more pages to fetch following the current page. */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are any pages prior to the current page. */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor corresponding to the first node in edges. */
  startCursor?: Maybe<Scalars['String']['output']>;
};

/** The set of valid sort keys for the Page query. */
export type PageSortKeys =
  /** Sort by the `id` value. */
  | 'ID'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `title` value. */
  | 'TITLE'
  /** Sort by the `updated_at` value. */
  | 'UPDATED_AT';

/** Type for paginating through multiple sitemap's resources. */
export type PaginatedSitemapResources = {
  __typename?: 'PaginatedSitemapResources';
  /** Whether there are more pages to fetch following the current page. */
  hasNextPage: Scalars['Boolean']['output'];
  /**
   * List of sitemap resources for the current page.
   * Note: The number of items varies between 0 and 250 per page.
   *
   */
  items: Array<SitemapResource | SitemapResourceMetaobject>;
};

/** Settings related to payments. */
export type PaymentSettings = {
  __typename?: 'PaymentSettings';
  /** List of the card brands which the business entity accepts. */
  acceptedCardBrands: Array<CardBrand>;
  /** The url pointing to the endpoint to vault credit cards. */
  cardVaultUrl: Scalars['URL']['output'];
  /** The country where the shop is located. When multiple business entities operate within the shop, then this will represent the country of the business entity that's serving the specified buyer context. */
  countryCode: CountryCode;
  /** The three-letter code for the shop's primary currency. */
  currencyCode: CurrencyCode;
  /**
   * A list of enabled currencies (ISO 4217 format) that the shop accepts.
   * Merchants can enable currencies from their Shopify Payments settings in the Shopify admin.
   *
   */
  enabledPresentmentCurrencies: Array<CurrencyCode>;
  /** The shop’s Shopify Payments account ID. */
  shopifyPaymentsAccountId?: Maybe<Scalars['String']['output']>;
  /** List of the digital wallets which the business entity supports. */
  supportedDigitalWallets: Array<DigitalWallet>;
};

/** Decides the distribution of results. */
export type PredictiveSearchLimitScope =
  /** Return results up to limit across all types. */
  | 'ALL'
  /** Return results up to limit per type. */
  | 'EACH';

/**
 * Returned by the [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) query to power type-ahead search experiences. Includes matching [`Product`](https://shopify.dev/docs/api/storefront/current/objects/Product), [`Collection`](https://shopify.dev/docs/api/storefront/current/objects/Collection), [`Page`](https://shopify.dev/docs/api/storefront/current/objects/Page), and [`Article`](https://shopify.dev/docs/api/storefront/current/objects/Article) objects, along with query suggestions that help customers refine their search.
 *
 */
export type PredictiveSearchResult = {
  __typename?: 'PredictiveSearchResult';
  /** The articles that match the search query. */
  articles: Array<Article>;
  /** The articles that match the search query. */
  collections: Array<Collection>;
  /** The pages that match the search query. */
  pages: Array<Page>;
  /** The products that match the search query. */
  products: Array<Product>;
  /** The query suggestions that are relevant to the search query. */
  queries: Array<SearchQuerySuggestion>;
};

/** The types of search items to perform predictive search on. */
export type PredictiveSearchType =
  /** Returns matching articles. */
  | 'ARTICLE'
  /** Returns matching collections. */
  | 'COLLECTION'
  /** Returns matching pages. */
  | 'PAGE'
  /** Returns matching products. */
  | 'PRODUCT'
  /** Returns matching query strings. */
  | 'QUERY';

/** The preferred delivery methods such as shipping, local pickup or through pickup points. */
export type PreferenceDeliveryMethodType =
  /** A delivery method used to let buyers collect purchases at designated locations like parcel lockers. */
  | 'PICKUP_POINT'
  /** A delivery method used to let buyers receive items directly from a specific location within an area. */
  | 'PICK_UP'
  /** A delivery method used to send items directly to a buyer’s specified address. */
  | 'SHIPPING';

/**
 * A price range for filtering products in a collection. Used by the [`ProductFilter`](https://shopify.dev/docs/api/storefront/current/input-objects/ProductFilter) input's [`price`](https://shopify.dev/docs/api/storefront/current/input-objects/ProductFilter#fields-price) field.
 *
 * > Note: Omitting the [maximum](https://shopify.dev/docs/api/storefront/currents/input-objects/PriceRangeFilter#fields-max) returns all products above the [minimum](https://shopify.dev/docs/api/storefront/current/input-objects/PriceRangeFilter#fields-min).
 *
 */
export type PriceRangeFilter = {
  /** The maximum price in the range. Empty indicates no max price. */
  max?: InputMaybe<Scalars['Float']['input']>;
  /** The minimum price in the range. Defaults to zero. */
  min?: InputMaybe<Scalars['Float']['input']>;
};

/**
 * A percentage discount value applied to cart items or orders. Returned as part of the [`PricingValue`](https://shopify.dev/docs/api/storefront/current/unions/PricingValue) union on [discount applications](https://shopify.dev/docs/api/storefront/current/interfaces/DiscountApplication), where it represents discounts calculated as a percentage off rather than a [fixed amount](https://shopify.dev/docs/api/storefront/current/objects/MoneyV2).
 *
 */
export type PricingPercentageValue = {
  __typename?: 'PricingPercentageValue';
  /** The percentage value of the object. */
  percentage: Scalars['Float']['output'];
};

/** The price value (fixed or percentage) for a discount application. */
export type PricingValue = MoneyV2 | PricingPercentageValue;

/**
 * Represents an item listed in a shop's catalog.
 *
 * Products support multiple [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), representing different versions of the same product, and can include various [media](https://shopify.dev/docs/api/storefront/current/interfaces/Media) types. Use the [`selectedOrFirstAvailableVariant`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.selectedOrFirstAvailableVariant) or [`variantBySelectedOptions`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.variantBySelectedOptions) fields to help customers find the right variant based on their selections.
 *
 * Products can be organized into [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), associated with [selling plans](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) for subscriptions, and extended with custom data through [metafields](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 * Learn more about working with [products and collections](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections).
 *
 */
export type Product = HasMetafields &
  Node &
  OnlineStorePublishable &
  Trackable & {
    __typename?: 'Product';
    /**
     * A list of variants whose selected options differ with the provided selected options by one, ordered by variant id.
     * If selected options are not provided, adjacent variants to the first available variant is returned.
     *
     * Note that this field returns an array of variants. In most cases, the number of variants in this array will be low.
     * However, with a low number of options and a high number of values per option, the number of variants returned
     * here can be high. In such cases, it recommended to avoid using this field.
     *
     * This list of variants can be used in combination with the `options` field to build a rich variant picker that
     * includes variant availability or other variant information.
     *
     */
    adjacentVariants: Array<ProductVariant>;
    /** Indicates if at least one product variant is available for sale. */
    availableForSale: Scalars['Boolean']['output'];
    /** The category of a product from [Shopify's Standard Product Taxonomy](https://shopify.github.io/product-taxonomy/releases/unstable/?categoryId=sg-4-17-2-17). */
    category?: Maybe<TaxonomyCategory>;
    /** A list of [collections](/docs/api/storefront/latest/objects/Collection) that include the product. */
    collections: CollectionConnection;
    /** The [compare-at price range](https://help.shopify.com/manual/products/details/product-pricing/sale-pricing) of the product in the shop's default currency. */
    compareAtPriceRange: ProductPriceRange;
    /** The date and time when the product was created. */
    createdAt: Scalars['DateTime']['output'];
    /** A single-line description of the product, with [HTML tags](https://developer.mozilla.org/en-US/docs/Web/HTML) removed. */
    description: Scalars['String']['output'];
    /**
     * The description of the product, with
     * HTML tags. For example, the description might include
     * bold `<strong></strong>` and italic `<i></i>` text.
     *
     */
    descriptionHtml: Scalars['HTML']['output'];
    /**
     * An encoded string containing all option value combinations
     * with a corresponding variant that is currently available for sale.
     *
     * Integers represent option and values:
     * [0,1] represents option_value at array index 0 for the option at array index 0
     *
     * `:`, `,`, ` ` and `-` are control characters.
     * `:` indicates a new option. ex: 0:1 indicates value 0 for the option in position 1, value 1 for the option in position 2.
     * `,` indicates the end of a repeated prefix, mulitple consecutive commas indicate the end of multiple repeated prefixes.
     * ` ` indicates a gap in the sequence of option values. ex: 0 4 indicates option values in position 0 and 4 are present.
     * `-` indicates a continuous range of option values. ex: 0 1-3 4
     *
     * Decoding process:
     *
     * Example options: [Size, Color, Material]
     * Example values: [[Small, Medium, Large], [Red, Blue], [Cotton, Wool]]
     * Example encoded string: "0:0:0,1:0-1,,1:0:0-1,1:1,,2:0:1,1:0,,"
     *
     * Step 1: Expand ranges into the numbers they represent: "0:0:0,1:0 1,,1:0:0 1,1:1,,2:0:1,1:0,,"
     * Step 2: Expand repeated prefixes: "0:0:0,0:1:0 1,1:0:0 1,1:1:1,2:0:1,2:1:0,"
     * Step 3: Expand shared prefixes so data is encoded as a string: "0:0:0,0:1:0,0:1:1,1:0:0,1:0:1,1:1:1,2:0:1,2:1:0,"
     * Step 4: Map to options + option values to determine existing variants:
     *
     * [Small, Red, Cotton] (0:0:0), [Small, Blue, Cotton] (0:1:0), [Small, Blue, Wool] (0:1:1),
     * [Medium, Red, Cotton] (1:0:0), [Medium, Red, Wool] (1:0:1), [Medium, Blue, Wool] (1:1:1),
     * [Large, Red, Wool] (2:0:1), [Large, Blue, Cotton] (2:1:0).
     *
     *
     */
    encodedVariantAvailability?: Maybe<Scalars['String']['output']>;
    /**
     * An encoded string containing all option value combinations with a corresponding variant.
     *
     * Integers represent option and values:
     * [0,1] represents option_value at array index 0 for the option at array index 0
     *
     * `:`, `,`, ` ` and `-` are control characters.
     * `:` indicates a new option. ex: 0:1 indicates value 0 for the option in position 1, value 1 for the option in position 2.
     * `,` indicates the end of a repeated prefix, mulitple consecutive commas indicate the end of multiple repeated prefixes.
     * ` ` indicates a gap in the sequence of option values. ex: 0 4 indicates option values in position 0 and 4 are present.
     * `-` indicates a continuous range of option values. ex: 0 1-3 4
     *
     * Decoding process:
     *
     * Example options: [Size, Color, Material]
     * Example values: [[Small, Medium, Large], [Red, Blue], [Cotton, Wool]]
     * Example encoded string: "0:0:0,1:0-1,,1:0:0-1,1:1,,2:0:1,1:0,,"
     *
     * Step 1: Expand ranges into the numbers they represent: "0:0:0,1:0 1,,1:0:0 1,1:1,,2:0:1,1:0,,"
     * Step 2: Expand repeated prefixes: "0:0:0,0:1:0 1,1:0:0 1,1:1:1,2:0:1,2:1:0,"
     * Step 3: Expand shared prefixes so data is encoded as a string: "0:0:0,0:1:0,0:1:1,1:0:0,1:0:1,1:1:1,2:0:1,2:1:0,"
     * Step 4: Map to options + option values to determine existing variants:
     *
     * [Small, Red, Cotton] (0:0:0), [Small, Blue, Cotton] (0:1:0), [Small, Blue, Wool] (0:1:1),
     * [Medium, Red, Cotton] (1:0:0), [Medium, Red, Wool] (1:0:1), [Medium, Blue, Wool] (1:1:1),
     * [Large, Red, Wool] (2:0:1), [Large, Blue, Cotton] (2:1:0).
     *
     *
     */
    encodedVariantExistence?: Maybe<Scalars['String']['output']>;
    /**
     * The featured image for the product.
     *
     * This field is functionally equivalent to `images(first: 1)`.
     *
     */
    featuredImage?: Maybe<Image>;
    /**
     * A unique, human-readable string of the product's title.
     * A handle can contain letters, hyphens (`-`), and numbers, but no spaces.
     * The handle is used in the online store URL for the product.
     *
     */
    handle: Scalars['String']['output'];
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** List of images associated with the product. */
    images: ImageConnection;
    /** Whether the product is a gift card. */
    isGiftCard: Scalars['Boolean']['output'];
    /** The [media](/docs/apps/build/online-store/product-media) that are associated with the product. Valid media are images, 3D models, videos. */
    media: MediaConnection;
    /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
    metafield?: Maybe<Metafield>;
    /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
    metafields: Array<Maybe<Metafield>>;
    /**
     * The product's URL on the online store.
     * If `null`, then the product isn't published to the online store sales channel.
     *
     */
    onlineStoreUrl?: Maybe<Scalars['URL']['output']>;
    /** A list of product options. The limit is defined by the [shop's resource limits for product options](/docs/api/admin-graphql/latest/objects/Shop#field-resourcelimits) (`Shop.resourceLimits.maxProductOptions`). */
    options: Array<ProductOption>;
    /**
     * The minimum and maximum prices of a product, expressed in decimal numbers.
     * For example, if the product is priced between $10.00 and $50.00,
     * then the price range is $10.00 - $50.00.
     *
     */
    priceRange: ProductPriceRange;
    /**
     * The [product type](https://help.shopify.com/manual/products/details/product-type)
     * that merchants define.
     *
     */
    productType: Scalars['String']['output'];
    /** The date and time when the product was published to the channel. */
    publishedAt: Scalars['DateTime']['output'];
    /** Whether the product can only be purchased with a [selling plan](/docs/apps/build/purchase-options/subscriptions/selling-plans). Products that are sold on subscription (`requiresSellingPlan: true`) can be updated only for online stores. If you update a product to be subscription-only (`requiresSellingPlan:false`), then the product is unpublished from all channels, except the online store. */
    requiresSellingPlan: Scalars['Boolean']['output'];
    /**
     * Find an active product variant based on selected options, availability or the first variant.
     *
     * All arguments are optional. If no selected options are provided, the first available variant is returned.
     * If no variants are available, the first variant is returned.
     *
     */
    selectedOrFirstAvailableVariant?: Maybe<ProductVariant>;
    /** A list of all [selling plan groups](/docs/apps/build/purchase-options/subscriptions/selling-plans/build-a-selling-plan) that are associated with the product either directly, or through the product's variants. */
    sellingPlanGroups: SellingPlanGroupConnection;
    /**
     * The [SEO title and description](https://help.shopify.com/manual/promoting-marketing/seo/adding-keywords)
     * that are associated with a product.
     *
     */
    seo: Seo;
    /**
     * A comma-separated list of searchable keywords that are
     * associated with the product. For example, a merchant might apply the `sports`
     * and `summer` tags to products that are associated with sportwear for summer.
     * Updating `tags` overwrites any existing tags that were previously added to the product.
     * To add new tags without overwriting existing tags,
     * use the GraphQL Admin API's [`tagsAdd`](/docs/api/admin-graphql/latest/mutations/tagsadd)
     * mutation.
     *
     */
    tags: Array<Scalars['String']['output']>;
    /**
     * The name for the product that displays to customers. The title is used to construct the product's handle.
     * For example, if a product is titled "Black Sunglasses", then the handle is `black-sunglasses`.
     *
     */
    title: Scalars['String']['output'];
    /** The quantity of inventory that's in stock. */
    totalInventory?: Maybe<Scalars['Int']['output']>;
    /** URL parameters to be added to a page URL to track the origin of on-site search traffic for [analytics reporting](https://help.shopify.com/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports). Returns a result when accessed through the [search](https://shopify.dev/docs/api/storefront/current/queries/search) or [predictiveSearch](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries, otherwise returns null. */
    trackingParameters?: Maybe<Scalars['String']['output']>;
    /**
     * The date and time when the product was last modified.
     * A product's `updatedAt` value can change for different reasons. For example, if an order
     * is placed for a product that has inventory tracking set up, then the inventory adjustment
     * is counted as an update.
     *
     */
    updatedAt: Scalars['DateTime']['output'];
    /**
     * Find a product’s variant based on its selected options.
     * This is useful for converting a user’s selection of product options into a single matching variant.
     * If there is not a variant for the selected options, `null` will be returned.
     *
     */
    variantBySelectedOptions?: Maybe<ProductVariant>;
    /** A list of [variants](/docs/api/storefront/latest/objects/ProductVariant) that are associated with the product. */
    variants: ProductVariantConnection;
    /** The number of [variants](/docs/api/storefront/latest/objects/ProductVariant) that are associated with the product. */
    variantsCount?: Maybe<Count>;
    /** The name of the product's vendor. */
    vendor: Scalars['String']['output'];
  };

/**
 * Represents an item listed in a shop's catalog.
 *
 * Products support multiple [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), representing different versions of the same product, and can include various [media](https://shopify.dev/docs/api/storefront/current/interfaces/Media) types. Use the [`selectedOrFirstAvailableVariant`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.selectedOrFirstAvailableVariant) or [`variantBySelectedOptions`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.variantBySelectedOptions) fields to help customers find the right variant based on their selections.
 *
 * Products can be organized into [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), associated with [selling plans](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) for subscriptions, and extended with custom data through [metafields](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 * Learn more about working with [products and collections](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections).
 *
 */
export type ProductAdjacentVariantsArgs = {
  caseInsensitiveMatch?: InputMaybe<Scalars['Boolean']['input']>;
  ignoreUnknownOptions?: InputMaybe<Scalars['Boolean']['input']>;
  selectedOptions?: InputMaybe<Array<SelectedOptionInput>>;
};

/**
 * Represents an item listed in a shop's catalog.
 *
 * Products support multiple [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), representing different versions of the same product, and can include various [media](https://shopify.dev/docs/api/storefront/current/interfaces/Media) types. Use the [`selectedOrFirstAvailableVariant`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.selectedOrFirstAvailableVariant) or [`variantBySelectedOptions`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.variantBySelectedOptions) fields to help customers find the right variant based on their selections.
 *
 * Products can be organized into [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), associated with [selling plans](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) for subscriptions, and extended with custom data through [metafields](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 * Learn more about working with [products and collections](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections).
 *
 */
export type ProductCollectionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * Represents an item listed in a shop's catalog.
 *
 * Products support multiple [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), representing different versions of the same product, and can include various [media](https://shopify.dev/docs/api/storefront/current/interfaces/Media) types. Use the [`selectedOrFirstAvailableVariant`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.selectedOrFirstAvailableVariant) or [`variantBySelectedOptions`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.variantBySelectedOptions) fields to help customers find the right variant based on their selections.
 *
 * Products can be organized into [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), associated with [selling plans](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) for subscriptions, and extended with custom data through [metafields](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 * Learn more about working with [products and collections](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections).
 *
 */
export type ProductDescriptionArgs = {
  truncateAt?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * Represents an item listed in a shop's catalog.
 *
 * Products support multiple [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), representing different versions of the same product, and can include various [media](https://shopify.dev/docs/api/storefront/current/interfaces/Media) types. Use the [`selectedOrFirstAvailableVariant`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.selectedOrFirstAvailableVariant) or [`variantBySelectedOptions`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.variantBySelectedOptions) fields to help customers find the right variant based on their selections.
 *
 * Products can be organized into [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), associated with [selling plans](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) for subscriptions, and extended with custom data through [metafields](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 * Learn more about working with [products and collections](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections).
 *
 */
export type ProductImagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<ProductImageSortKeys>;
};

/**
 * Represents an item listed in a shop's catalog.
 *
 * Products support multiple [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), representing different versions of the same product, and can include various [media](https://shopify.dev/docs/api/storefront/current/interfaces/Media) types. Use the [`selectedOrFirstAvailableVariant`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.selectedOrFirstAvailableVariant) or [`variantBySelectedOptions`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.variantBySelectedOptions) fields to help customers find the right variant based on their selections.
 *
 * Products can be organized into [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), associated with [selling plans](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) for subscriptions, and extended with custom data through [metafields](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 * Learn more about working with [products and collections](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections).
 *
 */
export type ProductMediaArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<ProductMediaSortKeys>;
};

/**
 * Represents an item listed in a shop's catalog.
 *
 * Products support multiple [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), representing different versions of the same product, and can include various [media](https://shopify.dev/docs/api/storefront/current/interfaces/Media) types. Use the [`selectedOrFirstAvailableVariant`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.selectedOrFirstAvailableVariant) or [`variantBySelectedOptions`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.variantBySelectedOptions) fields to help customers find the right variant based on their selections.
 *
 * Products can be organized into [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), associated with [selling plans](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) for subscriptions, and extended with custom data through [metafields](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 * Learn more about working with [products and collections](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections).
 *
 */
export type ProductMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * Represents an item listed in a shop's catalog.
 *
 * Products support multiple [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), representing different versions of the same product, and can include various [media](https://shopify.dev/docs/api/storefront/current/interfaces/Media) types. Use the [`selectedOrFirstAvailableVariant`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.selectedOrFirstAvailableVariant) or [`variantBySelectedOptions`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.variantBySelectedOptions) fields to help customers find the right variant based on their selections.
 *
 * Products can be organized into [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), associated with [selling plans](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) for subscriptions, and extended with custom data through [metafields](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 * Learn more about working with [products and collections](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections).
 *
 */
export type ProductMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/**
 * Represents an item listed in a shop's catalog.
 *
 * Products support multiple [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), representing different versions of the same product, and can include various [media](https://shopify.dev/docs/api/storefront/current/interfaces/Media) types. Use the [`selectedOrFirstAvailableVariant`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.selectedOrFirstAvailableVariant) or [`variantBySelectedOptions`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.variantBySelectedOptions) fields to help customers find the right variant based on their selections.
 *
 * Products can be organized into [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), associated with [selling plans](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) for subscriptions, and extended with custom data through [metafields](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 * Learn more about working with [products and collections](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections).
 *
 */
export type ProductOptionsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * Represents an item listed in a shop's catalog.
 *
 * Products support multiple [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), representing different versions of the same product, and can include various [media](https://shopify.dev/docs/api/storefront/current/interfaces/Media) types. Use the [`selectedOrFirstAvailableVariant`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.selectedOrFirstAvailableVariant) or [`variantBySelectedOptions`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.variantBySelectedOptions) fields to help customers find the right variant based on their selections.
 *
 * Products can be organized into [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), associated with [selling plans](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) for subscriptions, and extended with custom data through [metafields](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 * Learn more about working with [products and collections](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections).
 *
 */
export type ProductSelectedOrFirstAvailableVariantArgs = {
  caseInsensitiveMatch?: InputMaybe<Scalars['Boolean']['input']>;
  ignoreUnknownOptions?: InputMaybe<Scalars['Boolean']['input']>;
  selectedOptions?: InputMaybe<Array<SelectedOptionInput>>;
};

/**
 * Represents an item listed in a shop's catalog.
 *
 * Products support multiple [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), representing different versions of the same product, and can include various [media](https://shopify.dev/docs/api/storefront/current/interfaces/Media) types. Use the [`selectedOrFirstAvailableVariant`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.selectedOrFirstAvailableVariant) or [`variantBySelectedOptions`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.variantBySelectedOptions) fields to help customers find the right variant based on their selections.
 *
 * Products can be organized into [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), associated with [selling plans](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) for subscriptions, and extended with custom data through [metafields](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 * Learn more about working with [products and collections](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections).
 *
 */
export type ProductSellingPlanGroupsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * Represents an item listed in a shop's catalog.
 *
 * Products support multiple [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), representing different versions of the same product, and can include various [media](https://shopify.dev/docs/api/storefront/current/interfaces/Media) types. Use the [`selectedOrFirstAvailableVariant`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.selectedOrFirstAvailableVariant) or [`variantBySelectedOptions`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.variantBySelectedOptions) fields to help customers find the right variant based on their selections.
 *
 * Products can be organized into [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), associated with [selling plans](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) for subscriptions, and extended with custom data through [metafields](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 * Learn more about working with [products and collections](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections).
 *
 */
export type ProductVariantBySelectedOptionsArgs = {
  caseInsensitiveMatch?: InputMaybe<Scalars['Boolean']['input']>;
  ignoreUnknownOptions?: InputMaybe<Scalars['Boolean']['input']>;
  selectedOptions: Array<SelectedOptionInput>;
};

/**
 * Represents an item listed in a shop's catalog.
 *
 * Products support multiple [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), representing different versions of the same product, and can include various [media](https://shopify.dev/docs/api/storefront/current/interfaces/Media) types. Use the [`selectedOrFirstAvailableVariant`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.selectedOrFirstAvailableVariant) or [`variantBySelectedOptions`](https://shopify.dev/docs/api/storefront/current/objects/Product#field-Product.fields.variantBySelectedOptions) fields to help customers find the right variant based on their selections.
 *
 * Products can be organized into [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), associated with [selling plans](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) for subscriptions, and extended with custom data through [metafields](https://shopify.dev/docs/api/storefront/current/objects/Metafield).
 *
 * Learn more about working with [products and collections](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections).
 *
 */
export type ProductVariantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<ProductVariantSortKeys>;
};

/**
 * Sort options for products within a [`Collection`](https://shopify.dev/docs/api/storefront/current/objects/Collection). Used by the [`products`](https://shopify.dev/docs/api/storefront/current/objects/Collection#field-Collection.fields.products) connection to order results by best-selling, price, title, creation date, or the collection's default and manual ordering.
 *
 * > Note: The [`RELEVANCE`](https://shopify.dev/docs/api/storefront/current/enums/ProductCollectionSortKeys#enums-RELEVANCE) key applies only when you specify a search query.
 *
 */
export type ProductCollectionSortKeys =
  /** Sort by the `best-selling` value. */
  | 'BEST_SELLING'
  /** Sort by the `collection-default` value. */
  | 'COLLECTION_DEFAULT'
  /** Sort by the `created` value. */
  | 'CREATED'
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `manual` value. */
  | 'MANUAL'
  /** Sort by the `price` value. */
  | 'PRICE'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `title` value. */
  | 'TITLE';

/**
 * An auto-generated type for paginating through multiple Products.
 *
 */
export type ProductConnection = {
  __typename?: 'ProductConnection';
  /** A list of edges. */
  edges: Array<ProductEdge>;
  /** A list of available filters. */
  filters: Array<Filter>;
  /** A list of the nodes contained in ProductEdge. */
  nodes: Array<Product>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one Product and a cursor during pagination.
 *
 */
export type ProductEdge = {
  __typename?: 'ProductEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of ProductEdge. */
  node: Product;
};

/**
 * The input fields for a filter used to view a subset of products in a collection.
 * By default, the `available` and `price` filters are enabled. Filters are customized with the Shopify Search & Discovery app.
 * Learn more about [customizing storefront filtering](https://help.shopify.com/manual/online-store/themes/customizing-themes/storefront-filters).
 *
 */
export type ProductFilter = {
  /** Filter on if the product is available for sale. */
  available?: InputMaybe<Scalars['Boolean']['input']>;
  /** A product category to filter on. */
  category?: InputMaybe<CategoryFilter>;
  /** A range of prices to filter with-in. */
  price?: InputMaybe<PriceRangeFilter>;
  /** A product metafield to filter on. */
  productMetafield?: InputMaybe<MetafieldFilter>;
  /** The product type to filter on. */
  productType?: InputMaybe<Scalars['String']['input']>;
  /** The product vendor to filter on. */
  productVendor?: InputMaybe<Scalars['String']['input']>;
  /** A product tag to filter on. */
  tag?: InputMaybe<Scalars['String']['input']>;
  /** A standard product attribute metafield to filter on. */
  taxonomyMetafield?: InputMaybe<TaxonomyMetafieldFilter>;
  /** A variant metafield to filter on. */
  variantMetafield?: InputMaybe<MetafieldFilter>;
  /** A variant option to filter on. */
  variantOption?: InputMaybe<VariantOptionFilter>;
};

/** The set of valid sort keys for the ProductImage query. */
export type ProductImageSortKeys =
  /** Sort by the `created_at` value. */
  | 'CREATED_AT'
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `position` value. */
  | 'POSITION'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE';

/** The set of valid sort keys for the ProductMedia query. */
export type ProductMediaSortKeys =
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `position` value. */
  | 'POSITION'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE';

/**
 * A customizable product attribute that customers select when purchasing, such as "Size", "Color", or "Material". Each option has a name and a set of [`ProductOptionValue`](https://shopify.dev/docs/api/storefront/current/objects/ProductOptionValue) objects representing the available choices.
 *
 * Different combinations of option values create distinct [`ProductVariant`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant) objects. Option values can include visual swatches that display colors or images to help customers make selections. Option names have a 255-character limit.
 *
 * Learn more about [Shopify's product model](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections).
 *
 */
export type ProductOption = Node & {
  __typename?: 'ProductOption';
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The product option’s name. */
  name: Scalars['String']['output'];
  /** The corresponding option value to the product option. */
  optionValues: Array<ProductOptionValue>;
  /**
   * The corresponding value to the product option name.
   * @deprecated Use `optionValues` instead.
   */
  values: Array<Scalars['String']['output']>;
};

/**
 * A specific value for a [`ProductOption`](https://shopify.dev/docs/api/storefront/current/objects/ProductOption), such as "Red" or "Blue" for a "Color" option. Option values combine across different options to create [`ProductVariant`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant) objects.
 *
 * Each value can include a visual swatch that displays a color or image. The [`firstSelectableVariant`](https://shopify.dev/docs/api/storefront/current/objects/ProductOptionValue#field-ProductOptionValue.fields.firstSelectableVariant) field returns the variant that combines this option value with the lowest-position values for all other options. This is useful for building product selection interfaces.
 *
 * Learn more about [Shopify's product model](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections).
 *
 */
export type ProductOptionValue = Node & {
  __typename?: 'ProductOptionValue';
  /**
   * The product variant that combines this option value with the
   * lowest-position option values for all other options.
   *
   * This field will always return a variant, provided a variant including this option value exists.
   *
   */
  firstSelectableVariant?: Maybe<ProductVariant>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The name of the product option value. */
  name: Scalars['String']['output'];
  /** The swatch of the product option value. */
  swatch?: Maybe<ProductOptionValueSwatch>;
};

/**
 * A visual representation for a [`ProductOptionValue`](https://shopify.dev/docs/api/storefront/current/objects/ProductOptionValue), such as a color or image. Swatches help customers visualize options like "Red" or "Blue" without relying solely on text labels.
 *
 */
export type ProductOptionValueSwatch = {
  __typename?: 'ProductOptionValueSwatch';
  /** The swatch color. */
  color?: Maybe<Scalars['Color']['output']>;
  /** The swatch image. */
  image?: Maybe<ExternalVideo | MediaImage | Model3d | Video>;
};

/**
 * The minimum and maximum prices across all variants of a [`Product`](https://shopify.dev/docs/api/storefront/current/objects/Product).
 *
 */
export type ProductPriceRange = {
  __typename?: 'ProductPriceRange';
  /** The highest variant's price. */
  maxVariantPrice: MoneyV2;
  /** The lowest variant's price. */
  minVariantPrice: MoneyV2;
};

/**
 * The recommendation intent that is used to generate product recommendations.
 * You can use intent to generate product recommendations according to different strategies.
 *
 */
export type ProductRecommendationIntent =
  /** Offer customers products that are complementary to a product for which recommendations are to be fetched. An example is add-on products that display in a Pair it with section. */
  | 'COMPLEMENTARY'
  /** Offer customers a mix of products that are similar or complementary to a product for which recommendations are to be fetched. An example is substitutable products that display in a You may also like section. */
  | 'RELATED';

/**
 * Sorting options for the [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) query. Supports sorting products by criteria such as best-selling and price, and by product attributes such as type, and vendor.
 *
 * > Note: Use the [`RELEVANCE`](https://shopify.dev/docs/api/storefront/current/enums/ProductSortKeys#enums-RELEVANCE) key only when a search query is specified.
 *
 */
export type ProductSortKeys =
  /** Sort by the `best_selling` value. */
  | 'BEST_SELLING'
  /** Sort by the `created_at` value. */
  | 'CREATED_AT'
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `price` value. */
  | 'PRICE'
  /** Sort by the `product_type` value. */
  | 'PRODUCT_TYPE'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `title` value. */
  | 'TITLE'
  /** Sort by the `updated_at` value. */
  | 'UPDATED_AT'
  /** Sort by the `vendor` value. */
  | 'VENDOR';

/**
 * A specific version of a [product](https://shopify.dev/docs/api/storefront/current/objects/Product) available for sale, differentiated by options like size or color. For example, a small blue t-shirt and a large blue t-shirt are separate variants of the same product. For more information, see the docs on [Shopify's product model](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections).
 *
 * For products with quantity rules, variants enforce minimum, maximum, and increment constraints on purchases.
 *
 * Variants also support subscriptions and pre-orders through [selling plan allocations](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanAllocation) objects, bundle configurations through [product variant components](https://shopify.dev/docs/api/storefront/current/objects/ProductVariantComponent) objects, and [shop pay installments pricing](https://shopify.dev/docs/api/storefront/current/objects/ShopPayInstallmentsPricing) for flexible payment options.
 *
 */
export type ProductVariant = HasMetafields &
  Node & {
    __typename?: 'ProductVariant';
    /** Indicates if the product variant is available for sale. */
    availableForSale: Scalars['Boolean']['output'];
    /** The barcode (for example, ISBN, UPC, or GTIN) associated with the variant. */
    barcode?: Maybe<Scalars['String']['output']>;
    /** The compare at price of the variant. This can be used to mark a variant as on sale, when `compareAtPrice` is higher than `price`. */
    compareAtPrice?: Maybe<MoneyV2>;
    /**
     * The compare at price of the variant. This can be used to mark a variant as on sale, when `compareAtPriceV2` is higher than `priceV2`.
     * @deprecated Use `compareAtPrice` instead.
     */
    compareAtPriceV2?: Maybe<MoneyV2>;
    /**
     * List of bundles components included in the variant considering only fixed bundles.
     *
     */
    components: ProductVariantComponentConnection;
    /** Whether a product is out of stock but still available for purchase (used for backorders). */
    currentlyNotInStock: Scalars['Boolean']['output'];
    /**
     * List of bundles that include this variant considering only fixed bundles.
     *
     */
    groupedBy: ProductVariantConnection;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** Image associated with the product variant. This field falls back to the product image if no image is available. */
    image?: Maybe<Image>;
    /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
    metafield?: Maybe<Metafield>;
    /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
    metafields: Array<Maybe<Metafield>>;
    /** The product variant’s price. */
    price: MoneyV2;
    /**
     * The product variant’s price.
     * @deprecated Use `price` instead.
     */
    priceV2: MoneyV2;
    /** The product object that the product variant belongs to. */
    product: Product;
    /** The total sellable quantity of the variant for online sales channels. */
    quantityAvailable?: Maybe<Scalars['Int']['output']>;
    /** A list of quantity breaks for the product variant. */
    quantityPriceBreaks: QuantityPriceBreakConnection;
    /** The quantity rule for the product variant in a given context. */
    quantityRule: QuantityRule;
    /**
     * Whether a product variant requires components. The default value is `false`.
     * If `true`, then the product variant can only be purchased as a parent bundle with components.
     *
     */
    requiresComponents: Scalars['Boolean']['output'];
    /** Whether a customer needs to provide a shipping address when placing an order for the product variant. */
    requiresShipping: Scalars['Boolean']['output'];
    /** List of product options applied to the variant. */
    selectedOptions: Array<SelectedOption>;
    /** Represents an association between a variant and a selling plan. Selling plan allocations describe which selling plans are available for each variant, and what their impact is on pricing. */
    sellingPlanAllocations: SellingPlanAllocationConnection;
    /** The Shop Pay Installments pricing information for the product variant. */
    shopPayInstallmentsPricing?: Maybe<ShopPayInstallmentsProductVariantPricing>;
    /** The SKU (stock keeping unit) associated with the variant. */
    sku?: Maybe<Scalars['String']['output']>;
    /** The in-store pickup availability of this variant by location. */
    storeAvailability: StoreAvailabilityConnection;
    /** Whether tax is charged when the product variant is sold. */
    taxable: Scalars['Boolean']['output'];
    /** The product variant’s title. */
    title: Scalars['String']['output'];
    /** The unit price value for the variant based on the variant's measurement. */
    unitPrice?: Maybe<MoneyV2>;
    /** The unit price measurement for the variant. */
    unitPriceMeasurement?: Maybe<UnitPriceMeasurement>;
    /** The weight of the product variant in the unit system specified with `weight_unit`. */
    weight?: Maybe<Scalars['Float']['output']>;
    /** Unit of measurement for weight. */
    weightUnit: WeightUnit;
  };

/**
 * A specific version of a [product](https://shopify.dev/docs/api/storefront/current/objects/Product) available for sale, differentiated by options like size or color. For example, a small blue t-shirt and a large blue t-shirt are separate variants of the same product. For more information, see the docs on [Shopify's product model](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections).
 *
 * For products with quantity rules, variants enforce minimum, maximum, and increment constraints on purchases.
 *
 * Variants also support subscriptions and pre-orders through [selling plan allocations](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanAllocation) objects, bundle configurations through [product variant components](https://shopify.dev/docs/api/storefront/current/objects/ProductVariantComponent) objects, and [shop pay installments pricing](https://shopify.dev/docs/api/storefront/current/objects/ShopPayInstallmentsPricing) for flexible payment options.
 *
 */
export type ProductVariantComponentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * A specific version of a [product](https://shopify.dev/docs/api/storefront/current/objects/Product) available for sale, differentiated by options like size or color. For example, a small blue t-shirt and a large blue t-shirt are separate variants of the same product. For more information, see the docs on [Shopify's product model](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections).
 *
 * For products with quantity rules, variants enforce minimum, maximum, and increment constraints on purchases.
 *
 * Variants also support subscriptions and pre-orders through [selling plan allocations](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanAllocation) objects, bundle configurations through [product variant components](https://shopify.dev/docs/api/storefront/current/objects/ProductVariantComponent) objects, and [shop pay installments pricing](https://shopify.dev/docs/api/storefront/current/objects/ShopPayInstallmentsPricing) for flexible payment options.
 *
 */
export type ProductVariantGroupedByArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * A specific version of a [product](https://shopify.dev/docs/api/storefront/current/objects/Product) available for sale, differentiated by options like size or color. For example, a small blue t-shirt and a large blue t-shirt are separate variants of the same product. For more information, see the docs on [Shopify's product model](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections).
 *
 * For products with quantity rules, variants enforce minimum, maximum, and increment constraints on purchases.
 *
 * Variants also support subscriptions and pre-orders through [selling plan allocations](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanAllocation) objects, bundle configurations through [product variant components](https://shopify.dev/docs/api/storefront/current/objects/ProductVariantComponent) objects, and [shop pay installments pricing](https://shopify.dev/docs/api/storefront/current/objects/ShopPayInstallmentsPricing) for flexible payment options.
 *
 */
export type ProductVariantMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * A specific version of a [product](https://shopify.dev/docs/api/storefront/current/objects/Product) available for sale, differentiated by options like size or color. For example, a small blue t-shirt and a large blue t-shirt are separate variants of the same product. For more information, see the docs on [Shopify's product model](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections).
 *
 * For products with quantity rules, variants enforce minimum, maximum, and increment constraints on purchases.
 *
 * Variants also support subscriptions and pre-orders through [selling plan allocations](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanAllocation) objects, bundle configurations through [product variant components](https://shopify.dev/docs/api/storefront/current/objects/ProductVariantComponent) objects, and [shop pay installments pricing](https://shopify.dev/docs/api/storefront/current/objects/ShopPayInstallmentsPricing) for flexible payment options.
 *
 */
export type ProductVariantMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/**
 * A specific version of a [product](https://shopify.dev/docs/api/storefront/current/objects/Product) available for sale, differentiated by options like size or color. For example, a small blue t-shirt and a large blue t-shirt are separate variants of the same product. For more information, see the docs on [Shopify's product model](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections).
 *
 * For products with quantity rules, variants enforce minimum, maximum, and increment constraints on purchases.
 *
 * Variants also support subscriptions and pre-orders through [selling plan allocations](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanAllocation) objects, bundle configurations through [product variant components](https://shopify.dev/docs/api/storefront/current/objects/ProductVariantComponent) objects, and [shop pay installments pricing](https://shopify.dev/docs/api/storefront/current/objects/ShopPayInstallmentsPricing) for flexible payment options.
 *
 */
export type ProductVariantQuantityPriceBreaksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * A specific version of a [product](https://shopify.dev/docs/api/storefront/current/objects/Product) available for sale, differentiated by options like size or color. For example, a small blue t-shirt and a large blue t-shirt are separate variants of the same product. For more information, see the docs on [Shopify's product model](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections).
 *
 * For products with quantity rules, variants enforce minimum, maximum, and increment constraints on purchases.
 *
 * Variants also support subscriptions and pre-orders through [selling plan allocations](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanAllocation) objects, bundle configurations through [product variant components](https://shopify.dev/docs/api/storefront/current/objects/ProductVariantComponent) objects, and [shop pay installments pricing](https://shopify.dev/docs/api/storefront/current/objects/ShopPayInstallmentsPricing) for flexible payment options.
 *
 */
export type ProductVariantSellingPlanAllocationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * A specific version of a [product](https://shopify.dev/docs/api/storefront/current/objects/Product) available for sale, differentiated by options like size or color. For example, a small blue t-shirt and a large blue t-shirt are separate variants of the same product. For more information, see the docs on [Shopify's product model](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections).
 *
 * For products with quantity rules, variants enforce minimum, maximum, and increment constraints on purchases.
 *
 * Variants also support subscriptions and pre-orders through [selling plan allocations](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanAllocation) objects, bundle configurations through [product variant components](https://shopify.dev/docs/api/storefront/current/objects/ProductVariantComponent) objects, and [shop pay installments pricing](https://shopify.dev/docs/api/storefront/current/objects/ShopPayInstallmentsPricing) for flexible payment options.
 *
 */
export type ProductVariantStoreAvailabilityArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  near?: InputMaybe<GeoCoordinateInput>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * An individual product variant included in a [fixed bundle](https://shopify.dev/docs/apps/build/product-merchandising/bundles). Fixed bundles group multiple products together and sell them as a single unit, with the bundle's inventory determined by its components.
 *
 * Access components through the `ProductVariant` object's [`components`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant#field-ProductVariant.fields.components) field.
 *
 */
export type ProductVariantComponent = {
  __typename?: 'ProductVariantComponent';
  /** The product variant object that the component belongs to. */
  productVariant: ProductVariant;
  /** The quantity of component present in the bundle. */
  quantity: Scalars['Int']['output'];
};

/**
 * An auto-generated type for paginating through multiple ProductVariantComponents.
 *
 */
export type ProductVariantComponentConnection = {
  __typename?: 'ProductVariantComponentConnection';
  /** A list of edges. */
  edges: Array<ProductVariantComponentEdge>;
  /** A list of the nodes contained in ProductVariantComponentEdge. */
  nodes: Array<ProductVariantComponent>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one ProductVariantComponent and a cursor during pagination.
 *
 */
export type ProductVariantComponentEdge = {
  __typename?: 'ProductVariantComponentEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of ProductVariantComponentEdge. */
  node: ProductVariantComponent;
};

/**
 * An auto-generated type for paginating through multiple ProductVariants.
 *
 */
export type ProductVariantConnection = {
  __typename?: 'ProductVariantConnection';
  /** A list of edges. */
  edges: Array<ProductVariantEdge>;
  /** A list of the nodes contained in ProductVariantEdge. */
  nodes: Array<ProductVariant>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one ProductVariant and a cursor during pagination.
 *
 */
export type ProductVariantEdge = {
  __typename?: 'ProductVariantEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of ProductVariantEdge. */
  node: ProductVariant;
};

/** The set of valid sort keys for the ProductVariant query. */
export type ProductVariantSortKeys =
  /** Sort by the `id` value. */
  | 'ID'
  /** Sort by the `position` value. */
  | 'POSITION'
  /**
   * Sort by relevance to the search terms when the `query` parameter is specified on the connection.
   * Don't use this sort key when no search query is specified.
   *
   */
  | 'RELEVANCE'
  /** Sort by the `sku` value. */
  | 'SKU'
  /** Sort by the `title` value. */
  | 'TITLE';

/** Represents information about the buyer that is interacting with the cart. */
export type PurchasingCompany = {
  __typename?: 'PurchasingCompany';
  /** The company associated to the order or draft order. */
  company: Company;
  /** The company contact associated to the order or draft order. */
  contact?: Maybe<CompanyContact>;
  /** The company location associated to the order or draft order. */
  location: CompanyLocation;
};

/**
 * Quantity price breaks lets you offer different rates that are based on the
 * amount of a specific variant being ordered.
 *
 */
export type QuantityPriceBreak = {
  __typename?: 'QuantityPriceBreak';
  /**
   * Minimum quantity required to reach new quantity break price.
   *
   */
  minimumQuantity: Scalars['Int']['output'];
  /**
   * The price of variant after reaching the minimum quanity.
   *
   */
  price: MoneyV2;
};

/**
 * An auto-generated type for paginating through multiple QuantityPriceBreaks.
 *
 */
export type QuantityPriceBreakConnection = {
  __typename?: 'QuantityPriceBreakConnection';
  /** A list of edges. */
  edges: Array<QuantityPriceBreakEdge>;
  /** A list of the nodes contained in QuantityPriceBreakEdge. */
  nodes: Array<QuantityPriceBreak>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one QuantityPriceBreak and a cursor during pagination.
 *
 */
export type QuantityPriceBreakEdge = {
  __typename?: 'QuantityPriceBreakEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of QuantityPriceBreakEdge. */
  node: QuantityPriceBreak;
};

/**
 * The quantity rule for the product variant in a given context.
 *
 */
export type QuantityRule = {
  __typename?: 'QuantityRule';
  /**
   * The value that specifies the quantity increment between minimum and maximum of the rule.
   * Only quantities divisible by this value will be considered valid.
   *
   * The increment must be lower than or equal to the minimum and the maximum, and both minimum and maximum
   * must be divisible by this value.
   *
   */
  increment: Scalars['Int']['output'];
  /**
   * An optional value that defines the highest allowed quantity purchased by the customer.
   * If defined, maximum must be lower than or equal to the minimum and must be a multiple of the increment.
   *
   */
  maximum?: Maybe<Scalars['Int']['output']>;
  /**
   * The value that defines the lowest allowed quantity purchased by the customer.
   * The minimum must be a multiple of the quantity rule's increment.
   *
   */
  minimum: Scalars['Int']['output'];
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRoot = {
  __typename?: 'QueryRoot';
  /**
   * Returns an [`Article`](https://shopify.dev/docs/api/storefront/current/objects/Article) by its ID. Each article belongs to a [`Blog`](https://shopify.dev/docs/api/storefront/current/objects/Blog) and includes content in both plain text and HTML formats, [`ArticleAuthor`](https://shopify.dev/docs/api/storefront/current/objects/ArticleAuthor) information, [`Comment`](https://shopify.dev/docs/api/storefront/current/objects/Comment) objects, tags, and [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) data.
   *
   */
  article?: Maybe<Article>;
  /**
   * Returns a paginated list of [`Article`](https://shopify.dev/docs/api/storefront/current/objects/Article) objects from the shop's [`Blog`](https://shopify.dev/docs/api/storefront/current/objects/Blog) objects. Each article is a blog post containing content, author information, tags, and optional images.
   *
   * Use the `query` argument to filter results by author, blog title, tags, or date fields. Sort results using the `sortKey` argument and reverse them with the `reverse` argument.
   *
   */
  articles: ArticleConnection;
  /**
   * Retrieves a [`Blog`](https://shopify.dev/docs/api/storefront/current/objects/Blog) by its handle or ID. A blog organizes [`Article`](https://shopify.dev/docs/api/storefront/current/objects/Article) objects for the online store and includes author information, [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) settings, and custom [`Metafield`](https://shopify.dev/docs/api/storefront/current/objects/Metafield) objects.
   *
   */
  blog?: Maybe<Blog>;
  /**
   * Retrieves a [`Blog`](https://shopify.dev/docs/api/storefront/current/objects/Blog) by its handle. A blog organizes [`Article`](https://shopify.dev/docs/api/storefront/current/objects/Article) objects for the online store and includes author information, [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) settings, and custom [`Metafield`](https://shopify.dev/docs/api/storefront/current/objects/Metafield) objects.
   *
   * @deprecated Use `blog` instead.
   */
  blogByHandle?: Maybe<Blog>;
  /**
   * Returns a paginated list of the shop's [`Blog`](https://shopify.dev/docs/api/storefront/current/objects/Blog) objects. Each blog serves as a container for [`Article`](https://shopify.dev/docs/api/storefront/current/objects/Article) objects.
   *
   */
  blogs: BlogConnection;
  /**
   * Returns a [`Cart`](https://shopify.dev/docs/api/storefront/current/objects/Cart) by its ID. The cart contains the merchandise lines a buyer intends to purchase, along with estimated costs, applied discounts, gift cards, and delivery options.
   *
   * Use the [`checkoutUrl`](https://shopify.dev/docs/api/storefront/latest/queries/cart#returns-Cart.fields.checkoutUrl) field to redirect buyers to Shopify's web checkout when they're ready to complete their purchase. For more information, refer to [Manage a cart with the Storefront API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage).
   *
   */
  cart?: Maybe<Cart>;
  /**
   * A poll for the status of the cart checkout completion and order creation.
   *
   */
  cartCompletionAttempt?: Maybe<CartCompletionAttemptResult>;
  /**
   * Retrieves a single [`Collection`](https://shopify.dev/docs/api/storefront/current/objects/Collection) by its ID or handle. Use the [`products`](https://shopify.dev/docs/api/storefront/current/objects/Collection#field-Collection.fields.products) field to access items in the collection.
   *
   */
  collection?: Maybe<Collection>;
  /**
   * Retrieves a [`Collection`](https://shopify.dev/docs/api/storefront/current/objects/Collection) by its URL-friendly handle. Handles are automatically generated from collection titles but merchants can customize them.
   *
   * @deprecated Use `collection` instead.
   */
  collectionByHandle?: Maybe<Collection>;
  /**
   * Returns a paginated list of the shop's [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection). Each `Collection` object includes a nested connection to its [products](https://shopify.dev/docs/api/storefront/current/objects/Collection#field-Collection.fields.products).
   *
   */
  collections: CollectionConnection;
  /**
   * Retrieves the [`Customer`](https://shopify.dev/docs/api/storefront/current/objects/Customer) associated with the provided access token. Use the [`customerAccessTokenCreate`](https://shopify.dev/docs/api/storefront/current/mutations/customerAccessTokenCreate) mutation to obtain an access token using legacy customer account authentication (email and password).
   *
   * The returned customer includes data such as contact information, [addresses](https://shopify.dev/docs/api/storefront/current/objects/MailingAddress), [orders](https://shopify.dev/docs/api/storefront/current/objects/Order), and [custom data](https://shopify.dev/docs/apps/build/custom-data) associated with the customer.
   *
   */
  customer?: Maybe<Customer>;
  /**
   * Returns the shop's localization settings. Use this query to build [country and language selectors](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/markets) for your storefront.
   *
   * The [`country`](https://shopify.dev/docs/api/storefront/latest/queries/localization#returns-Localization.fields.country) and [`language`](https://shopify.dev/docs/api/storefront/latest/queries/localization#returns-Localization.fields.language) fields reflect the active localized experience. To change the context, use the [`@inContext`](https://shopify.dev/docs/api/storefront#directives) directive with your desired country or language code.
   *
   */
  localization: Localization;
  /**
   * Returns shop locations that support in-store pickup. Use the `near` argument with [`GeoCoordinateInput`](https://shopify.dev/docs/api/storefront/current/input-objects/GeoCoordinateInput) to sort results by proximity to the customer's location.
   *
   * When sorting by distance, set `sortKey` to [`DISTANCE`](https://shopify.dev/docs/api/storefront/current/queries/locations#arguments-sortKey.enums.DISTANCE) and provide coordinates using the [`near`](https://shopify.dev/docs/api/storefront/current/queries/locations#arguments-near) argument.
   *
   * Learn more about [supporting local pickup on storefronts](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/local-pickup).
   *
   */
  locations: LocationConnection;
  /**
   * Retrieves a [`Menu`](https://shopify.dev/docs/api/storefront/current/objects/Menu) by its handle. Menus are [hierarchical navigation structures](https://help.shopify.com/manual/online-store/menus-and-links) that merchants configure for their storefront, such as header and footer navigation.
   *
   * Each menu contains [`MenuItem`](https://shopify.dev/docs/api/storefront/current/objects/MenuItem) objects that can nest up to three levels deep, with each item linking to [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), [products](https://shopify.dev/docs/api/storefront/current/objects/Product), [pages](https://shopify.dev/docs/api/storefront/current/objects/Page), [blogs](https://shopify.dev/docs/api/storefront/current/objects/Blog), or external URLs.
   *
   */
  menu?: Maybe<Menu>;
  /**
   * Retrieves a single [`Metaobject`](https://shopify.dev/docs/api/storefront/current/objects/Metaobject) by either its [`global ID`](https://shopify.dev/docs/api/storefront/current/queries/metaobject#arguments-id) or its [`handle`](https://shopify.dev/docs/api/storefront/current/queries/metaobject#arguments-handle).
   *
   * > Note:
   * > When using the handle, you must also provide the metaobject type because handles are only unique within a type.
   *
   */
  metaobject?: Maybe<Metaobject>;
  /**
   * Returns a paginated list of [`Metaobject`](https://shopify.dev/docs/api/storefront/current/objects/Metaobject) entries for a specific type. Metaobjects are [custom data structures](https://shopify.dev/docs/apps/build/metaobjects) that extend Shopify's data model with merchant-defined or app-defined content like size charts, product highlights, or custom sections.
   *
   * The required `type` argument specifies which metaobject type to retrieve. You can sort results by `id` or `updated_at` using the `sortKey` argument.
   *
   */
  metaobjects: MetaobjectConnection;
  /**
   * Retrieves any object that implements the [`Node`](https://shopify.dev/docs/api/storefront/current/interfaces/Node) interface by its globally-unique ID. Use inline fragments to access type-specific fields on the returned object.
   *
   * This query follows the [Relay specification](https://relay.dev/graphql/objectidentification.htm#sec-Node-Interface) and is commonly used for refetching objects when you have their ID but need updated data.
   *
   */
  node?: Maybe<
    | AppliedGiftCard
    | Article
    | Blog
    | Cart
    | CartLine
    | Collection
    | Comment
    | Company
    | CompanyContact
    | CompanyLocation
    | ComponentizableCartLine
    | ExternalVideo
    | GenericFile
    | Location
    | MailingAddress
    | Market
    | MediaImage
    | MediaPresentation
    | Menu
    | MenuItem
    | Metafield
    | Metaobject
    | Model3d
    | Order
    | Page
    | Product
    | ProductOption
    | ProductOptionValue
    | ProductVariant
    | Shop
    | ShopPayInstallmentsFinancingPlan
    | ShopPayInstallmentsFinancingPlanTerm
    | ShopPayInstallmentsProductVariantPricing
    | ShopPolicy
    | TaxonomyCategory
    | UrlRedirect
    | Video
  >;
  /**
   * Retrieves multiple objects by their global IDs in a single request. Any object that implements the [`Node`](https://shopify.dev/docs/api/storefront/current/interfaces/Node) interface can be fetched, including [products](https://shopify.dev/docs/api/storefront/current/objects/Product), [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), and [pages](https://shopify.dev/docs/api/storefront/current/objects/Page).
   *
   * Use inline fragments to access type-specific fields on the returned objects. The input accepts up to 250 IDs.
   *
   */
  nodes: Array<
    Maybe<
      | AppliedGiftCard
      | Article
      | Blog
      | Cart
      | CartLine
      | Collection
      | Comment
      | Company
      | CompanyContact
      | CompanyLocation
      | ComponentizableCartLine
      | ExternalVideo
      | GenericFile
      | Location
      | MailingAddress
      | Market
      | MediaImage
      | MediaPresentation
      | Menu
      | MenuItem
      | Metafield
      | Metaobject
      | Model3d
      | Order
      | Page
      | Product
      | ProductOption
      | ProductOptionValue
      | ProductVariant
      | Shop
      | ShopPayInstallmentsFinancingPlan
      | ShopPayInstallmentsFinancingPlanTerm
      | ShopPayInstallmentsProductVariantPricing
      | ShopPolicy
      | TaxonomyCategory
      | UrlRedirect
      | Video
    >
  >;
  /**
   * Retrieves a [`Page`](https://shopify.dev/docs/api/storefront/current/objects/Page) by its [`handle`](https://shopify.dev/docs/api/storefront/current/queries/page#arguments-handle) or [`id`](https://shopify.dev/docs/api/storefront/current/queries/page#arguments-id). Pages are static content pages that merchants display outside their product catalog, such as "About Us," "Contact," or policy pages.
   *
   * The returned page includes information such as the [HTML body content](https://shopify.dev/docs/api/storefront/current/queries/page#returns-Page.fields.body), [`SEO`](https://shopify.dev/docs/api/storefront/current/objects/SEO) information, and any associated [`Metafield`](https://shopify.dev/docs/api/storefront/current/objects/Metafield) objects.
   *
   */
  page?: Maybe<Page>;
  /**
   * Retrieves a [`Page`](https://shopify.dev/docs/api/storefront/current/objects/Page) by its handle.
   *
   * @deprecated Use `page` instead.
   */
  pageByHandle?: Maybe<Page>;
  /**
   * Returns a paginated list of the shop's content [pages](https://shopify.dev/docs/api/storefront/current/objects/Page). Pages are custom HTML content like "About Us", "Contact", or policy information that merchants display outside their product catalog.
   *
   */
  pages: PageConnection;
  /** Settings related to payments. */
  paymentSettings: PaymentSettings;
  /**
   * Returns suggested results as customers type in a search field, enabling type-ahead search experiences. The query matches [products](https://shopify.dev/docs/api/storefront/current/objects/Product), [collections](https://shopify.dev/docs/api/storefront/current/objects/Collection), [pages](https://shopify.dev/docs/api/storefront/current/objects/Page), and [articles](https://shopify.dev/docs/api/storefront/current/objects/Article) based on partial search terms, and also provides [search query suggestions](https://shopify.dev/docs/api/storefront/current/objects/SearchQuerySuggestion) to help customers refine their search.
   *
   * You can filter results by resource type and limit the quantity. The [`limitScope`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch#arguments-limitScope) argument controls whether limits apply across all result types or per type. Use [`unavailableProducts`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch#arguments-unavailableProducts) to control how out-of-stock products appear in results.
   *
   */
  predictiveSearch?: Maybe<PredictiveSearchResult>;
  /**
   * Retrieves a single [`Product`](https://shopify.dev/docs/api/storefront/current/objects/Product) by its ID or handle. Use this query to build product detail pages, access variant and pricing information, or fetch product media and [metafields](https://shopify.dev/docs/api/storefront/current/objects/Metafield). See some [examples of querying products](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/getting-started).
   *
   */
  product?: Maybe<Product>;
  /**
   * Retrieves a [`Product`](https://shopify.dev/docs/api/storefront/current/objects/Product) by its handle. The handle is a URL-friendly identifier that's automatically generated from the product's title. If no product exists with the specified handle, returns `null`.
   *
   * @deprecated Use `product` instead.
   */
  productByHandle?: Maybe<Product>;
  /**
   * Returns recommended products for a given product, identified by either ID or handle. Use the [`intent`](https://shopify.dev/docs/api/storefront/current/enums/ProductRecommendationIntent) argument to control the recommendation strategy.
   *
   * Shopify [auto-generates related recommendations](https://shopify.dev/docs/storefronts/themes/product-merchandising/recommendations) based on sales data, product descriptions, and collection relationships. Complementary recommendations require [manual configuration](https://help.shopify.com/manual/online-store/storefront-search/search-and-discovery-recommendations) through the Shopify Search & Discovery app. Returns up to ten [`Product`](https://shopify.dev/docs/api/storefront/current/objects/Product) objects.
   *
   */
  productRecommendations?: Maybe<Array<Product>>;
  /**
   * Returns a paginated list of all tags that have been added to [products](https://shopify.dev/docs/api/storefront/current/objects/Product) in the shop. Useful for building tag-based product filtering or navigation in a storefront.
   *
   */
  productTags: StringConnection;
  /**
   * Returns a list of product types from the shop's [`Product`](https://shopify.dev/docs/api/storefront/current/objects/Product) objects that are published to your app. Use this query to build [filtering interfaces](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/filter-products) or navigation menus based on product categorization.
   *
   */
  productTypes: StringConnection;
  /**
   * Returns a paginated list of the shop's [products](https://shopify.dev/docs/api/storefront/current/objects/Product).
   *
   * For full-text storefront search, use the [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) query instead.
   *
   */
  products: ProductConnection;
  /**
   * Returns all public Storefront [API versions](https://shopify.dev/docs/api/storefront/current/objects/ApiVersion), including supported, release candidate, and unstable versions.
   *
   */
  publicApiVersions: Array<ApiVersion>;
  /**
   * Returns paginated search results for [`Product`](https://shopify.dev/docs/api/storefront/current/objects/Product), [`Page`](https://shopify.dev/docs/api/storefront/current/objects/Page), and [`Article`](https://shopify.dev/docs/api/storefront/current/objects/Article) resources based on a query string. Results are sorted by relevance by default.
   *
   * The response includes the total result count and available product filters for building [faceted search interfaces](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/filter-products). Use the [`prefix`](https://shopify.dev/docs/api/storefront/current/enums/SearchPrefixQueryType) argument to enable partial word matching on the last search term, allowing queries like "winter snow" to match "snowboard" or "snowshoe".
   *
   */
  search: SearchResultItemConnection;
  /**
   * Returns the [`Shop`](https://shopify.dev/docs/api/storefront/current/objects/Shop) associated with the storefront access token. The `Shop` object provides general store information such as the shop name, description, and primary domain.
   *
   * Use this query to access data like store policies, [`PaymentSettings`](https://shopify.dev/docs/api/storefront/current/objects/PaymentSettings), [`Brand`](https://shopify.dev/docs/api/storefront/current/objects/Brand) configuration, and shipping destinations. It also exposes [`ShopPayInstallmentsPricing`](https://shopify.dev/docs/api/storefront/current/objects/ShopPayInstallmentsPricing) and [`SocialLoginProvider`](https://shopify.dev/docs/api/storefront/current/objects/SocialLoginProvider) options for customer accounts.
   *
   */
  shop: Shop;
  /**
   * Returns sitemap data for a specific resource type, enabling headless storefronts to generate XML sitemaps for search engine optimization. The query provides a page count and paginated access to resources like [`Product`](https://shopify.dev/docs/api/storefront/current/objects/Product), [`Collection`](https://shopify.dev/docs/api/storefront/current/objects/Collection), [`Page`](https://shopify.dev/docs/api/storefront/current/objects/Page), and [`Blog`](https://shopify.dev/docs/api/storefront/current/objects/Blog) objects.
   *
   * When paginating through resources, the number of items per page varies from 0 to 250, and empty pages can occur without indicating the end of results. Always check [`hasNextPage`](https://shopify.dev/docs/api/storefront/current/objects/PaginatedSitemapResources#field-PaginatedSitemapResources.fields.hasNextPage) to determine if more pages are available.
   *
   */
  sitemap: Sitemap;
  /**
   * Returns a paginated list of [`UrlRedirect`](https://shopify.dev/docs/api/storefront/current/objects/UrlRedirect) objects configured for the shop. Each redirect maps an old path to a target location.
   *
   */
  urlRedirects: UrlRedirectConnection;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootArticleArgs = {
  id: Scalars['ID']['input'];
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootArticlesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<ArticleSortKeys>;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootBlogArgs = {
  handle?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootBlogByHandleArgs = {
  handle: Scalars['String']['input'];
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootBlogsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<BlogSortKeys>;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootCartArgs = {
  id: Scalars['ID']['input'];
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootCartCompletionAttemptArgs = {
  attemptId: Scalars['String']['input'];
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootCollectionArgs = {
  handle?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootCollectionByHandleArgs = {
  handle: Scalars['String']['input'];
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootCollectionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<CollectionSortKeys>;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootCustomerArgs = {
  customerAccessToken: Scalars['String']['input'];
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootLocationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  near?: InputMaybe<GeoCoordinateInput>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<LocationSortKeys>;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootMenuArgs = {
  handle: Scalars['String']['input'];
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootMetaobjectArgs = {
  handle?: InputMaybe<MetaobjectHandleInput>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootMetaobjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<Scalars['String']['input']>;
  type: Scalars['String']['input'];
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootNodeArgs = {
  id: Scalars['ID']['input'];
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootPageArgs = {
  handle?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootPageByHandleArgs = {
  handle: Scalars['String']['input'];
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootPagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<PageSortKeys>;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootPredictiveSearchArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  limitScope?: InputMaybe<PredictiveSearchLimitScope>;
  query: Scalars['String']['input'];
  searchableFields?: InputMaybe<Array<SearchableField>>;
  types?: InputMaybe<Array<PredictiveSearchType>>;
  unavailableProducts?: InputMaybe<SearchUnavailableProductsType>;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootProductArgs = {
  handle?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootProductByHandleArgs = {
  handle: Scalars['String']['input'];
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootProductRecommendationsArgs = {
  intent?: InputMaybe<ProductRecommendationIntent>;
  productHandle?: InputMaybe<Scalars['String']['input']>;
  productId?: InputMaybe<Scalars['ID']['input']>;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootProductTagsArgs = {
  first: Scalars['Int']['input'];
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootProductTypesArgs = {
  first: Scalars['Int']['input'];
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<ProductSortKeys>;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootSearchArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  prefix?: InputMaybe<SearchPrefixQueryType>;
  productFilters?: InputMaybe<Array<ProductFilter>>;
  query: Scalars['String']['input'];
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
  sortKey?: InputMaybe<SearchSortKeys>;
  types?: InputMaybe<Array<SearchType>>;
  unavailableProducts?: InputMaybe<SearchUnavailableProductsType>;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootSitemapArgs = {
  type: SitemapType;
};

/**
 * The entry point for all Storefront API queries. Provides access to shop resources including products, collections, carts, and customer data, as well as content like articles and pages. This query acts as the public, top-level type from which all queries must start.
 *
 * Use individual queries like [`product`](https://shopify.dev/docs/api/storefront/current/queries/product) or [`collection`](https://shopify.dev/docs/api/storefront/current/queries/collection) to fetch specific resources by ID or handle. Use plural queries like [`products`](https://shopify.dev/docs/api/storefront/current/queries/products) or [`collections`](https://shopify.dev/docs/api/storefront/current/queries/collections) to retrieve paginated lists with optional filtering and sorting. The [`search`](https://shopify.dev/docs/api/storefront/current/queries/search) and [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries enable storefront search functionality.
 *
 * Explore queries interactively with the [GraphiQL explorer and sample query kit](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration).
 *
 */
export type QueryRootUrlRedirectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * Search engine optimization metadata for a resource. The title and description appear in search engine results and browser tabs.
 *
 */
export type Seo = {
  __typename?: 'SEO';
  /** The meta description. */
  description?: Maybe<Scalars['String']['output']>;
  /** The SEO title. */
  title?: Maybe<Scalars['String']['output']>;
};

/**
 * A discount application created by a Shopify Script. Implements the [`DiscountApplication`](https://shopify.dev/docs/api/storefront/current/interfaces/DiscountApplication) interface and captures the discount's value, allocation method, and targeting rules at the time the script applied it.
 *
 */
export type ScriptDiscountApplication = DiscountApplication & {
  __typename?: 'ScriptDiscountApplication';
  /** The method by which the discount's value is allocated to its entitled items. */
  allocationMethod: DiscountApplicationAllocationMethod;
  /** Which lines of targetType that the discount is allocated over. */
  targetSelection: DiscountApplicationTargetSelection;
  /** The type of line that the discount is applicable towards. */
  targetType: DiscountApplicationTargetType;
  /** The title of the application as defined by the Script. */
  title: Scalars['String']['output'];
  /** The value of the discount application. */
  value: PricingValue;
};

/** Specifies whether to perform a partial word match on the last search term. */
export type SearchPrefixQueryType =
  /** Perform a partial word match on the last search term. */
  | 'LAST'
  /** Don't perform a partial word match on the last search term. */
  | 'NONE';

/**
 * A suggested search term returned by the [`predictiveSearch`](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) query. Query suggestions help customers refine their searches by showing relevant terms as they type.
 *
 * The [`text`](https://shopify.dev/docs/api/storefront/current/objects/SearchQuerySuggestion#field-SearchQuerySuggestion.fields.text) field provides the plain suggestion, while [`styledText`](https://shopify.dev/docs/api/storefront/current/objects/SearchQuerySuggestion#field-SearchQuerySuggestion.fields.styledText) includes HTML tags to highlight matching portions. Implements [`Trackable`](https://shopify.dev/docs/api/storefront/current/interfaces/Trackable) for analytics reporting on search traffic origins.
 *
 */
export type SearchQuerySuggestion = Trackable & {
  __typename?: 'SearchQuerySuggestion';
  /** The text of the search query suggestion with highlighted HTML tags. */
  styledText: Scalars['String']['output'];
  /** The text of the search query suggestion. */
  text: Scalars['String']['output'];
  /** URL parameters to be added to a page URL to track the origin of on-site search traffic for [analytics reporting](https://help.shopify.com/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports). Returns a result when accessed through the [search](https://shopify.dev/docs/api/storefront/current/queries/search) or [predictiveSearch](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries, otherwise returns null. */
  trackingParameters?: Maybe<Scalars['String']['output']>;
};

/**
 * A search result that matches the search query.
 *
 */
export type SearchResultItem = Article | Page | Product;

/**
 * An auto-generated type for paginating through multiple SearchResultItems.
 *
 */
export type SearchResultItemConnection = {
  __typename?: 'SearchResultItemConnection';
  /** A list of edges. */
  edges: Array<SearchResultItemEdge>;
  /** A list of the nodes contained in SearchResultItemEdge. */
  nodes: Array<SearchResultItem>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** A list of available filters. */
  productFilters: Array<Filter>;
  /** The total number of results. */
  totalCount: Scalars['Int']['output'];
};

/**
 * An auto-generated type which holds one SearchResultItem and a cursor during pagination.
 *
 */
export type SearchResultItemEdge = {
  __typename?: 'SearchResultItemEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of SearchResultItemEdge. */
  node: SearchResultItem;
};

/** The set of valid sort keys for the search query. */
export type SearchSortKeys =
  /** Sort by the `price` value. */
  | 'PRICE'
  /** Sort by relevance to the search terms. */
  | 'RELEVANCE';

/** The types of search items to perform search within. */
export type SearchType =
  /** Returns matching articles. */
  | 'ARTICLE'
  /** Returns matching pages. */
  | 'PAGE'
  /** Returns matching products. */
  | 'PRODUCT';

/** Specifies whether to display results for unavailable products. */
export type SearchUnavailableProductsType =
  /** Exclude unavailable products. */
  | 'HIDE'
  /** Show unavailable products after all other matching results. This is the default. */
  | 'LAST'
  /** Show unavailable products in the order that they're found. */
  | 'SHOW';

/** Specifies the list of resource fields to search. */
export type SearchableField =
  /** Author of the page or article. */
  | 'AUTHOR'
  /** Body of the page or article or product description or collection description. */
  | 'BODY'
  /** Product type. */
  | 'PRODUCT_TYPE'
  /** Tag associated with the product or article. */
  | 'TAG'
  /** Title of the page or article or product title or collection title. */
  | 'TITLE'
  /** Variant barcode. */
  | 'VARIANTS_BARCODE'
  /** Variant SKU. */
  | 'VARIANTS_SKU'
  /** Variant title. */
  | 'VARIANTS_TITLE'
  /** Product vendor. */
  | 'VENDOR';

/**
 * A name/value pair representing a product option selection on a variant. The [`ProductVariant`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant) object's [`selectedOptions`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant#field-ProductVariant.fields.selectedOptions) field returns this to indicate which options define that variant, such as "Size: Large" or "Color: Red".
 *
 */
export type SelectedOption = {
  __typename?: 'SelectedOption';
  /** The product option’s name. */
  name: Scalars['String']['output'];
  /** The product option’s value. */
  value: Scalars['String']['output'];
};

/** The input fields required for a selected option. */
export type SelectedOptionInput = {
  /** The product option’s name. */
  name: Scalars['String']['input'];
  /** The product option’s value. */
  value: Scalars['String']['input'];
};

/**
 * Represents deferred or recurring purchase options for [products](https://shopify.dev/docs/api/storefront/current/objects/Product) and [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), such as subscriptions, pre-orders, or try-before-you-buy. Each selling plan belongs to a [`SellingPlanGroup`](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) and defines billing, pricing, inventory, and delivery policies.
 *
 */
export type SellingPlan = HasMetafields & {
  __typename?: 'SellingPlan';
  /** The billing policy for the selling plan. */
  billingPolicy?: Maybe<SellingPlanBillingPolicy>;
  /** The initial payment due for the purchase. */
  checkoutCharge: SellingPlanCheckoutCharge;
  /** The delivery policy for the selling plan. */
  deliveryPolicy?: Maybe<SellingPlanDeliveryPolicy>;
  /** The description of the selling plan. */
  description?: Maybe<Scalars['String']['output']>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
  metafield?: Maybe<Metafield>;
  /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
  metafields: Array<Maybe<Metafield>>;
  /** The name of the selling plan. For example, '6 weeks of prepaid granola, delivered weekly'. */
  name: Scalars['String']['output'];
  /** The selling plan options available in the drop-down list in the storefront. For example, 'Delivery every week' or 'Delivery every 2 weeks' specifies the delivery frequency options for the product. Individual selling plans contribute their options to the associated selling plan group. For example, a selling plan group might have an option called `option1: Delivery every`. One selling plan in that group could contribute `option1: 2 weeks` with the pricing for that option, and another selling plan could contribute `option1: 4 weeks`, with different pricing. */
  options: Array<SellingPlanOption>;
  /** The price adjustments that a selling plan makes when a variant is purchased with a selling plan. */
  priceAdjustments: Array<SellingPlanPriceAdjustment>;
  /** Whether purchasing the selling plan will result in multiple deliveries. */
  recurringDeliveries: Scalars['Boolean']['output'];
};

/**
 * Represents deferred or recurring purchase options for [products](https://shopify.dev/docs/api/storefront/current/objects/Product) and [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), such as subscriptions, pre-orders, or try-before-you-buy. Each selling plan belongs to a [`SellingPlanGroup`](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) and defines billing, pricing, inventory, and delivery policies.
 *
 */
export type SellingPlanMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * Represents deferred or recurring purchase options for [products](https://shopify.dev/docs/api/storefront/current/objects/Product) and [product variants](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant), such as subscriptions, pre-orders, or try-before-you-buy. Each selling plan belongs to a [`SellingPlanGroup`](https://shopify.dev/docs/api/storefront/current/objects/SellingPlanGroup) and defines billing, pricing, inventory, and delivery policies.
 *
 */
export type SellingPlanMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/**
 * Links a [`ProductVariant`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant) to a [`SellingPlan`](https://shopify.dev/docs/api/storefront/current/objects/SellingPlan), providing the pricing details for that specific combination. Each allocation includes the checkout charge amount, any remaining balance due for the purchase, and up to two price adjustments that show how the selling plan affects the variant's price.
 *
 * Selling plan allocations are available on product variants and [cart lines](https://shopify.dev/docs/api/storefront/current/objects/CartLine), enabling storefronts to display information such as subscription or purchase option pricing before and during checkout.
 *
 */
export type SellingPlanAllocation = {
  __typename?: 'SellingPlanAllocation';
  /** The checkout charge amount due for the purchase. */
  checkoutChargeAmount: MoneyV2;
  /** A list of price adjustments, with a maximum of two. When there are two, the first price adjustment goes into effect at the time of purchase, while the second one starts after a certain number of orders. A price adjustment represents how a selling plan affects pricing when a variant is purchased with a selling plan. Prices display in the customer's currency if the shop is configured for it. */
  priceAdjustments: Array<SellingPlanAllocationPriceAdjustment>;
  /** The remaining balance charge amount due for the purchase. */
  remainingBalanceChargeAmount: MoneyV2;
  /** A representation of how products and variants can be sold and purchased. For example, an individual selling plan could be '6 weeks of prepaid granola, delivered weekly'. */
  sellingPlan: SellingPlan;
};

/**
 * An auto-generated type for paginating through multiple SellingPlanAllocations.
 *
 */
export type SellingPlanAllocationConnection = {
  __typename?: 'SellingPlanAllocationConnection';
  /** A list of edges. */
  edges: Array<SellingPlanAllocationEdge>;
  /** A list of the nodes contained in SellingPlanAllocationEdge. */
  nodes: Array<SellingPlanAllocation>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one SellingPlanAllocation and a cursor during pagination.
 *
 */
export type SellingPlanAllocationEdge = {
  __typename?: 'SellingPlanAllocationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of SellingPlanAllocationEdge. */
  node: SellingPlanAllocation;
};

/** The resulting prices for variants when they're purchased with a specific selling plan. */
export type SellingPlanAllocationPriceAdjustment = {
  __typename?: 'SellingPlanAllocationPriceAdjustment';
  /** The price of the variant when it's purchased without a selling plan for the same number of deliveries. For example, if a customer purchases 6 deliveries of $10.00 granola separately, then the price is 6 x $10.00 = $60.00. */
  compareAtPrice: MoneyV2;
  /** The effective price for a single delivery. For example, for a prepaid subscription plan that includes 6 deliveries at the price of $48.00, the per delivery price is $8.00. */
  perDeliveryPrice: MoneyV2;
  /** The price of the variant when it's purchased with a selling plan For example, for a prepaid subscription plan that includes 6 deliveries of $10.00 granola, where the customer gets 20% off, the price is 6 x $10.00 x 0.80 = $48.00. */
  price: MoneyV2;
  /** The resulting price per unit for the variant associated with the selling plan. If the variant isn't sold by quantity or measurement, then this field returns `null`. */
  unitPrice?: Maybe<MoneyV2>;
};

/** The selling plan billing policy. */
export type SellingPlanBillingPolicy = SellingPlanRecurringBillingPolicy;

/** The initial payment due for the purchase. */
export type SellingPlanCheckoutCharge = {
  __typename?: 'SellingPlanCheckoutCharge';
  /** The charge type for the checkout charge. */
  type: SellingPlanCheckoutChargeType;
  /** The charge value for the checkout charge. */
  value: SellingPlanCheckoutChargeValue;
};

/** The percentage value of the price used for checkout charge. */
export type SellingPlanCheckoutChargePercentageValue = {
  __typename?: 'SellingPlanCheckoutChargePercentageValue';
  /** The percentage value of the price used for checkout charge. */
  percentage: Scalars['Float']['output'];
};

/** The checkout charge when the full amount isn't charged at checkout. */
export type SellingPlanCheckoutChargeType =
  /** The checkout charge is a percentage of the product or variant price. */
  | 'PERCENTAGE'
  /** The checkout charge is a fixed price amount. */
  | 'PRICE';

/** The portion of the price to be charged at checkout. */
export type SellingPlanCheckoutChargeValue =
  | MoneyV2
  | SellingPlanCheckoutChargePercentageValue;

/**
 * An auto-generated type for paginating through multiple SellingPlans.
 *
 */
export type SellingPlanConnection = {
  __typename?: 'SellingPlanConnection';
  /** A list of edges. */
  edges: Array<SellingPlanEdge>;
  /** A list of the nodes contained in SellingPlanEdge. */
  nodes: Array<SellingPlan>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** The selling plan delivery policy. */
export type SellingPlanDeliveryPolicy = SellingPlanRecurringDeliveryPolicy;

/**
 * An auto-generated type which holds one SellingPlan and a cursor during pagination.
 *
 */
export type SellingPlanEdge = {
  __typename?: 'SellingPlanEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of SellingPlanEdge. */
  node: SellingPlan;
};

/** A fixed amount that's deducted from the original variant price. For example, $10.00 off. */
export type SellingPlanFixedAmountPriceAdjustment = {
  __typename?: 'SellingPlanFixedAmountPriceAdjustment';
  /** The money value of the price adjustment. */
  adjustmentAmount: MoneyV2;
};

/** A fixed price adjustment for a variant that's purchased with a selling plan. */
export type SellingPlanFixedPriceAdjustment = {
  __typename?: 'SellingPlanFixedPriceAdjustment';
  /** A new price of the variant when it's purchased with the selling plan. */
  price: MoneyV2;
};

/**
 * A selling method that defines how products can be sold through purchase options like subscriptions, pre-orders, or try-before-you-buy. Groups one or more [`SellingPlan`](https://shopify.dev/docs/api/storefront/current/objects/SellingPlan) objects that share the same selling method and options.
 *
 * The `SellingPlanGroup` acts as a container for one or more individual `SellingPlan` objects, enabling merchants to offer multiple options (like weekly or monthly deliveries) under one, unified category on a product page.
 *
 */
export type SellingPlanGroup = {
  __typename?: 'SellingPlanGroup';
  /** A display friendly name for the app that created the selling plan group. */
  appName?: Maybe<Scalars['String']['output']>;
  /** The name of the selling plan group. */
  name: Scalars['String']['output'];
  /** Represents the selling plan options available in the drop-down list in the storefront. For example, 'Delivery every week' or 'Delivery every 2 weeks' specifies the delivery frequency options for the product. */
  options: Array<SellingPlanGroupOption>;
  /** A list of selling plans in a selling plan group. A selling plan is a representation of how products and variants can be sold and purchased. For example, an individual selling plan could be '6 weeks of prepaid granola, delivered weekly'. */
  sellingPlans: SellingPlanConnection;
};

/**
 * A selling method that defines how products can be sold through purchase options like subscriptions, pre-orders, or try-before-you-buy. Groups one or more [`SellingPlan`](https://shopify.dev/docs/api/storefront/current/objects/SellingPlan) objects that share the same selling method and options.
 *
 * The `SellingPlanGroup` acts as a container for one or more individual `SellingPlan` objects, enabling merchants to offer multiple options (like weekly or monthly deliveries) under one, unified category on a product page.
 *
 */
export type SellingPlanGroupSellingPlansArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  reverse?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * An auto-generated type for paginating through multiple SellingPlanGroups.
 *
 */
export type SellingPlanGroupConnection = {
  __typename?: 'SellingPlanGroupConnection';
  /** A list of edges. */
  edges: Array<SellingPlanGroupEdge>;
  /** A list of the nodes contained in SellingPlanGroupEdge. */
  nodes: Array<SellingPlanGroup>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one SellingPlanGroup and a cursor during pagination.
 *
 */
export type SellingPlanGroupEdge = {
  __typename?: 'SellingPlanGroupEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of SellingPlanGroupEdge. */
  node: SellingPlanGroup;
};

/**
 * Represents an option on a selling plan group that's available in the drop-down list in the storefront.
 *
 * Individual selling plans contribute their options to the associated selling plan group. For example, a selling plan group might have an option called `option1: Delivery every`. One selling plan in that group could contribute `option1: 2 weeks` with the pricing for that option, and another selling plan could contribute `option1: 4 weeks`, with different pricing.
 */
export type SellingPlanGroupOption = {
  __typename?: 'SellingPlanGroupOption';
  /** The name of the option. For example, 'Delivery every'. */
  name: Scalars['String']['output'];
  /** The values for the options specified by the selling plans in the selling plan group. For example, '1 week', '2 weeks', '3 weeks'. */
  values: Array<Scalars['String']['output']>;
};

/** Represents a valid selling plan interval. */
export type SellingPlanInterval =
  /** Day interval. */
  | 'DAY'
  /** Month interval. */
  | 'MONTH'
  /** Week interval. */
  | 'WEEK'
  /** Year interval. */
  | 'YEAR';

/** An option provided by a Selling Plan. */
export type SellingPlanOption = {
  __typename?: 'SellingPlanOption';
  /** The name of the option (ie "Delivery every"). */
  name?: Maybe<Scalars['String']['output']>;
  /** The value of the option (ie "Month"). */
  value?: Maybe<Scalars['String']['output']>;
};

/** A percentage amount that's deducted from the original variant price. For example, 10% off. */
export type SellingPlanPercentagePriceAdjustment = {
  __typename?: 'SellingPlanPercentagePriceAdjustment';
  /** The percentage value of the price adjustment. */
  adjustmentPercentage: Scalars['Float']['output'];
};

/** Represents by how much the price of a variant associated with a selling plan is adjusted. Each variant can have up to two price adjustments. If a variant has multiple price adjustments, then the first price adjustment applies when the variant is initially purchased. The second price adjustment applies after a certain number of orders (specified by the `orderCount` field) are made. If a selling plan doesn't have any price adjustments, then the unadjusted price of the variant is the effective price. */
export type SellingPlanPriceAdjustment = {
  __typename?: 'SellingPlanPriceAdjustment';
  /** The type of price adjustment. An adjustment value can have one of three types: percentage, amount off, or a new price. */
  adjustmentValue: SellingPlanPriceAdjustmentValue;
  /** The number of orders that the price adjustment applies to. If the price adjustment always applies, then this field is `null`. */
  orderCount?: Maybe<Scalars['Int']['output']>;
};

/** Represents by how much the price of a variant associated with a selling plan is adjusted. Each variant can have up to two price adjustments. */
export type SellingPlanPriceAdjustmentValue =
  | SellingPlanFixedAmountPriceAdjustment
  | SellingPlanFixedPriceAdjustment
  | SellingPlanPercentagePriceAdjustment;

/** The recurring billing policy for the selling plan. */
export type SellingPlanRecurringBillingPolicy = {
  __typename?: 'SellingPlanRecurringBillingPolicy';
  /** The billing frequency, it can be either: day, week, month or year. */
  interval: SellingPlanInterval;
  /** The number of intervals between billings. */
  intervalCount: Scalars['Int']['output'];
};

/** The recurring delivery policy for the selling plan. */
export type SellingPlanRecurringDeliveryPolicy = {
  __typename?: 'SellingPlanRecurringDeliveryPolicy';
  /** The delivery frequency, it can be either: day, week, month or year. */
  interval: SellingPlanInterval;
  /** The number of intervals between deliveries. */
  intervalCount: Scalars['Int']['output'];
};

/**
 * The central hub for store-wide settings and information accessible through the Storefront API. Provides the shop's name, description, and branding configuration including logos and colors through the [`Brand`](https://shopify.dev/docs/api/storefront/current/objects/Brand) object.
 *
 * Access store policies such as privacy, refund, shipping, and terms of service via [`ShopPolicy`](https://shopify.dev/docs/api/storefront/current/objects/ShopPolicy), and the subscription policy via [`ShopPolicyWithDefault`](https://shopify.dev/docs/api/storefront/current/objects/ShopPolicyWithDefault). [`PaymentSettings`](https://shopify.dev/docs/api/storefront/current/objects/PaymentSettings) expose accepted card brands, supported digital wallets, and enabled presentment currencies. The object also includes the primary [`Domain`](https://shopify.dev/docs/api/storefront/current/objects/Domain), countries the shop ships to, [`ShopPayInstallmentsPricing`](https://shopify.dev/docs/api/storefront/current/objects/ShopPayInstallmentsPricing), and [`SocialLoginProvider`](https://shopify.dev/docs/api/storefront/current/objects/SocialLoginProvider) options for customer accounts.
 *
 */
export type Shop = HasMetafields &
  Node & {
    __typename?: 'Shop';
    /** The shop's branding configuration. */
    brand?: Maybe<Brand>;
    /** The shop's contact information. */
    contactInformation?: Maybe<ShopPolicy>;
    /** Translations for customer accounts. */
    customerAccountTranslations?: Maybe<Array<Translation>>;
    /** The URL for the customer account (only present if shop has a customer account vanity domain). */
    customerAccountUrl?: Maybe<Scalars['String']['output']>;
    /** A description of the shop. */
    description?: Maybe<Scalars['String']['output']>;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The shop's legal notice. */
    legalNotice?: Maybe<ShopPolicy>;
    /** A [custom field](https://shopify.dev/docs/apps/build/custom-data), including its `namespace` and `key`, that's associated with a Shopify resource for the purposes of adding and storing additional information. */
    metafield?: Maybe<Metafield>;
    /** A list of [custom fields](/docs/apps/build/custom-data) that a merchant associates with a Shopify resource. */
    metafields: Array<Maybe<Metafield>>;
    /** A string representing the way currency is formatted when the currency isn’t specified. */
    moneyFormat: Scalars['String']['output'];
    /** The shop’s name. */
    name: Scalars['String']['output'];
    /** Settings related to payments. */
    paymentSettings: PaymentSettings;
    /** The primary domain of the shop’s Online Store. */
    primaryDomain: Domain;
    /** The shop’s privacy policy. */
    privacyPolicy?: Maybe<ShopPolicy>;
    /** The shop’s refund policy. */
    refundPolicy?: Maybe<ShopPolicy>;
    /** The shop’s shipping policy. */
    shippingPolicy?: Maybe<ShopPolicy>;
    /** Countries that the shop ships to. */
    shipsToCountries: Array<CountryCode>;
    /** The Shop Pay Installments pricing information for the shop. */
    shopPayInstallmentsPricing?: Maybe<ShopPayInstallmentsPricing>;
    /** The social login providers for customer accounts. */
    socialLoginProviders: Array<SocialLoginProvider>;
    /** The shop’s subscription policy. */
    subscriptionPolicy?: Maybe<ShopPolicyWithDefault>;
    /** The shop's terms of sale. */
    termsOfSale?: Maybe<ShopPolicy>;
    /** The shop’s terms of service. */
    termsOfService?: Maybe<ShopPolicy>;
  };

/**
 * The central hub for store-wide settings and information accessible through the Storefront API. Provides the shop's name, description, and branding configuration including logos and colors through the [`Brand`](https://shopify.dev/docs/api/storefront/current/objects/Brand) object.
 *
 * Access store policies such as privacy, refund, shipping, and terms of service via [`ShopPolicy`](https://shopify.dev/docs/api/storefront/current/objects/ShopPolicy), and the subscription policy via [`ShopPolicyWithDefault`](https://shopify.dev/docs/api/storefront/current/objects/ShopPolicyWithDefault). [`PaymentSettings`](https://shopify.dev/docs/api/storefront/current/objects/PaymentSettings) expose accepted card brands, supported digital wallets, and enabled presentment currencies. The object also includes the primary [`Domain`](https://shopify.dev/docs/api/storefront/current/objects/Domain), countries the shop ships to, [`ShopPayInstallmentsPricing`](https://shopify.dev/docs/api/storefront/current/objects/ShopPayInstallmentsPricing), and [`SocialLoginProvider`](https://shopify.dev/docs/api/storefront/current/objects/SocialLoginProvider) options for customer accounts.
 *
 */
export type ShopMetafieldArgs = {
  key: Scalars['String']['input'];
  namespace?: InputMaybe<Scalars['String']['input']>;
};

/**
 * The central hub for store-wide settings and information accessible through the Storefront API. Provides the shop's name, description, and branding configuration including logos and colors through the [`Brand`](https://shopify.dev/docs/api/storefront/current/objects/Brand) object.
 *
 * Access store policies such as privacy, refund, shipping, and terms of service via [`ShopPolicy`](https://shopify.dev/docs/api/storefront/current/objects/ShopPolicy), and the subscription policy via [`ShopPolicyWithDefault`](https://shopify.dev/docs/api/storefront/current/objects/ShopPolicyWithDefault). [`PaymentSettings`](https://shopify.dev/docs/api/storefront/current/objects/PaymentSettings) expose accepted card brands, supported digital wallets, and enabled presentment currencies. The object also includes the primary [`Domain`](https://shopify.dev/docs/api/storefront/current/objects/Domain), countries the shop ships to, [`ShopPayInstallmentsPricing`](https://shopify.dev/docs/api/storefront/current/objects/ShopPayInstallmentsPricing), and [`SocialLoginProvider`](https://shopify.dev/docs/api/storefront/current/objects/SocialLoginProvider) options for customer accounts.
 *
 */
export type ShopMetafieldsArgs = {
  identifiers: Array<HasMetafieldsIdentifier>;
};

/** The financing plan in Shop Pay Installments. */
export type ShopPayInstallmentsFinancingPlan = Node & {
  __typename?: 'ShopPayInstallmentsFinancingPlan';
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The maximum price to qualify for the financing plan. */
  maxPrice: MoneyV2;
  /** The minimum price to qualify for the financing plan. */
  minPrice: MoneyV2;
  /** The terms of the financing plan. */
  terms: Array<ShopPayInstallmentsFinancingPlanTerm>;
};

/** The payment frequency for a Shop Pay Installments Financing Plan. */
export type ShopPayInstallmentsFinancingPlanFrequency =
  /** Monthly payment frequency. */
  | 'MONTHLY'
  /** Weekly payment frequency. */
  | 'WEEKLY';

/** The terms of the financing plan in Shop Pay Installments. */
export type ShopPayInstallmentsFinancingPlanTerm = Node & {
  __typename?: 'ShopPayInstallmentsFinancingPlanTerm';
  /** The annual percentage rate (APR) of the financing plan. */
  apr: Scalars['Int']['output'];
  /** The payment frequency for the financing plan. */
  frequency: ShopPayInstallmentsFinancingPlanFrequency;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** The number of installments for the financing plan. */
  installmentsCount?: Maybe<Count>;
  /** The type of loan for the financing plan. */
  loanType: ShopPayInstallmentsLoan;
};

/** The loan type for a Shop Pay Installments Financing Plan Term. */
export type ShopPayInstallmentsLoan =
  /** An interest-bearing loan type. */
  | 'INTEREST'
  /** A split-pay loan type. */
  | 'SPLIT_PAY'
  /** A zero-percent loan type. */
  | 'ZERO_PERCENT';

/** The result for a Shop Pay Installments pricing request. */
export type ShopPayInstallmentsPricing = {
  __typename?: 'ShopPayInstallmentsPricing';
  /** The financing plans available for the given price range. */
  financingPlans: Array<ShopPayInstallmentsFinancingPlan>;
  /** The maximum price to qualify for financing. */
  maxPrice: MoneyV2;
  /** The minimum price to qualify for financing. */
  minPrice: MoneyV2;
};

/** The shop pay installments pricing information for a product variant. */
export type ShopPayInstallmentsProductVariantPricing = Node & {
  __typename?: 'ShopPayInstallmentsProductVariantPricing';
  /** Whether the product variant is available. */
  available: Scalars['Boolean']['output'];
  /** Whether the product variant is eligible for Shop Pay Installments. */
  eligible: Scalars['Boolean']['output'];
  /** The full price of the product variant. */
  fullPrice: MoneyV2;
  /** The ID of the product variant. */
  id: Scalars['ID']['output'];
  /** The number of payment terms available for the product variant. */
  installmentsCount?: Maybe<Count>;
  /** The price per term for the product variant. */
  pricePerTerm: MoneyV2;
};

/** Represents a Shop Pay payment request. */
export type ShopPayPaymentRequest = {
  __typename?: 'ShopPayPaymentRequest';
  /** The delivery methods for the payment request. */
  deliveryMethods: Array<ShopPayPaymentRequestDeliveryMethod>;
  /** The discount codes for the payment request. */
  discountCodes: Array<Scalars['String']['output']>;
  /** The discounts for the payment request order. */
  discounts?: Maybe<Array<ShopPayPaymentRequestDiscount>>;
  /** The line items for the payment request. */
  lineItems: Array<ShopPayPaymentRequestLineItem>;
  /** The locale for the payment request. */
  locale: Scalars['String']['output'];
  /** The presentment currency for the payment request. */
  presentmentCurrency: CurrencyCode;
  /** The delivery method type for the payment request. */
  selectedDeliveryMethodType: ShopPayPaymentRequestDeliveryMethodType;
  /** The shipping address for the payment request. */
  shippingAddress?: Maybe<ShopPayPaymentRequestContactField>;
  /** The shipping lines for the payment request. */
  shippingLines: Array<ShopPayPaymentRequestShippingLine>;
  /** The subtotal amount for the payment request. */
  subtotal: MoneyV2;
  /** The total amount for the payment request. */
  total: MoneyV2;
  /** The total shipping price for the payment request. */
  totalShippingPrice?: Maybe<ShopPayPaymentRequestTotalShippingPrice>;
  /** The total tax for the payment request. */
  totalTax?: Maybe<MoneyV2>;
};

/** Represents a contact field for a Shop Pay payment request. */
export type ShopPayPaymentRequestContactField = {
  __typename?: 'ShopPayPaymentRequestContactField';
  /** The first address line of the contact field. */
  address1: Scalars['String']['output'];
  /** The second address line of the contact field. */
  address2?: Maybe<Scalars['String']['output']>;
  /** The city of the contact field. */
  city: Scalars['String']['output'];
  /** The company name of the contact field. */
  companyName?: Maybe<Scalars['String']['output']>;
  /** The country of the contact field. */
  countryCode: Scalars['String']['output'];
  /** The email of the contact field. */
  email?: Maybe<Scalars['String']['output']>;
  /** The first name of the contact field. */
  firstName: Scalars['String']['output'];
  /** The first name of the contact field. */
  lastName: Scalars['String']['output'];
  /** The phone number of the contact field. */
  phone?: Maybe<Scalars['String']['output']>;
  /** The postal code of the contact field. */
  postalCode?: Maybe<Scalars['String']['output']>;
  /** The province of the contact field. */
  provinceCode?: Maybe<Scalars['String']['output']>;
};

/** Represents a delivery method for a Shop Pay payment request. */
export type ShopPayPaymentRequestDeliveryMethod = {
  __typename?: 'ShopPayPaymentRequestDeliveryMethod';
  /** The amount for the delivery method. */
  amount: MoneyV2;
  /** The code of the delivery method. */
  code: Scalars['String']['output'];
  /** The detail about when the delivery may be expected. */
  deliveryExpectationLabel?: Maybe<Scalars['String']['output']>;
  /** The detail of the delivery method. */
  detail?: Maybe<Scalars['String']['output']>;
  /** The label of the delivery method. */
  label: Scalars['String']['output'];
  /** The maximum delivery date for the delivery method. */
  maxDeliveryDate?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** The minimum delivery date for the delivery method. */
  minDeliveryDate?: Maybe<Scalars['ISO8601DateTime']['output']>;
};

/** The input fields to create a delivery method for a Shop Pay payment request. */
export type ShopPayPaymentRequestDeliveryMethodInput = {
  /** The amount for the delivery method. */
  amount?: InputMaybe<MoneyInput>;
  /** The code of the delivery method. */
  code?: InputMaybe<Scalars['String']['input']>;
  /** The detail about when the delivery may be expected. */
  deliveryExpectationLabel?: InputMaybe<Scalars['String']['input']>;
  /** The detail of the delivery method. */
  detail?: InputMaybe<Scalars['String']['input']>;
  /** The label of the delivery method. */
  label?: InputMaybe<Scalars['String']['input']>;
  /** The maximum delivery date for the delivery method. */
  maxDeliveryDate?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
  /** The minimum delivery date for the delivery method. */
  minDeliveryDate?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
};

/** Represents the delivery method type for a Shop Pay payment request. */
export type ShopPayPaymentRequestDeliveryMethodType =
  /** The delivery method type is pickup. */
  | 'PICKUP'
  /** The delivery method type is shipping. */
  | 'SHIPPING';

/** Represents a discount for a Shop Pay payment request. */
export type ShopPayPaymentRequestDiscount = {
  __typename?: 'ShopPayPaymentRequestDiscount';
  /** The amount of the discount. */
  amount: MoneyV2;
  /** The label of the discount. */
  label: Scalars['String']['output'];
};

/** The input fields to create a discount for a Shop Pay payment request. */
export type ShopPayPaymentRequestDiscountInput = {
  /** The amount of the discount. */
  amount?: InputMaybe<MoneyInput>;
  /** The label of the discount. */
  label?: InputMaybe<Scalars['String']['input']>;
};

/** Represents an image for a Shop Pay payment request line item. */
export type ShopPayPaymentRequestImage = {
  __typename?: 'ShopPayPaymentRequestImage';
  /** The alt text of the image. */
  alt?: Maybe<Scalars['String']['output']>;
  /** The source URL of the image. */
  url: Scalars['String']['output'];
};

/** The input fields to create an image for a Shop Pay payment request. */
export type ShopPayPaymentRequestImageInput = {
  /** The alt text of the image. */
  alt?: InputMaybe<Scalars['String']['input']>;
  /** The source URL of the image. */
  url: Scalars['String']['input'];
};

/** The input fields represent a Shop Pay payment request. */
export type ShopPayPaymentRequestInput = {
  /**
   * The delivery methods for the payment request.
   *
   * The input must not contain more than `250` values.
   */
  deliveryMethods?: InputMaybe<Array<ShopPayPaymentRequestDeliveryMethodInput>>;
  /**
   * The discount codes for the payment request.
   *
   * The input must not contain more than `250` values.
   */
  discountCodes?: InputMaybe<Array<Scalars['String']['input']>>;
  /**
   * The discounts for the payment request order.
   *
   * The input must not contain more than `250` values.
   */
  discounts?: InputMaybe<Array<ShopPayPaymentRequestDiscountInput>>;
  /**
   * The line items for the payment request.
   *
   * The input must not contain more than `250` values.
   */
  lineItems?: InputMaybe<Array<ShopPayPaymentRequestLineItemInput>>;
  /** The locale for the payment request. */
  locale: Scalars['String']['input'];
  /** The encrypted payment method for the payment request. */
  paymentMethod?: InputMaybe<Scalars['String']['input']>;
  /** The presentment currency for the payment request. */
  presentmentCurrency: CurrencyCode;
  /** The delivery method type for the payment request. */
  selectedDeliveryMethodType?: InputMaybe<ShopPayPaymentRequestDeliveryMethodType>;
  /**
   * The shipping lines for the payment request.
   *
   * The input must not contain more than `250` values.
   */
  shippingLines?: InputMaybe<Array<ShopPayPaymentRequestShippingLineInput>>;
  /** The subtotal amount for the payment request. */
  subtotal: MoneyInput;
  /** The total amount for the payment request. */
  total: MoneyInput;
  /** The total shipping price for the payment request. */
  totalShippingPrice?: InputMaybe<ShopPayPaymentRequestTotalShippingPriceInput>;
  /** The total tax for the payment request. */
  totalTax?: InputMaybe<MoneyInput>;
};

/** Represents a line item for a Shop Pay payment request. */
export type ShopPayPaymentRequestLineItem = {
  __typename?: 'ShopPayPaymentRequestLineItem';
  /** The final item price for the line item. */
  finalItemPrice: MoneyV2;
  /** The final line price for the line item. */
  finalLinePrice: MoneyV2;
  /** The image of the line item. */
  image?: Maybe<ShopPayPaymentRequestImage>;
  /** The item discounts for the line item. */
  itemDiscounts?: Maybe<Array<ShopPayPaymentRequestDiscount>>;
  /** The label of the line item. */
  label: Scalars['String']['output'];
  /** The line discounts for the line item. */
  lineDiscounts?: Maybe<Array<ShopPayPaymentRequestDiscount>>;
  /** The original item price for the line item. */
  originalItemPrice?: Maybe<MoneyV2>;
  /** The original line price for the line item. */
  originalLinePrice?: Maybe<MoneyV2>;
  /** The quantity of the line item. */
  quantity: Scalars['Int']['output'];
  /** Whether the line item requires shipping. */
  requiresShipping?: Maybe<Scalars['Boolean']['output']>;
  /** The SKU of the line item. */
  sku?: Maybe<Scalars['String']['output']>;
};

/** The input fields to create a line item for a Shop Pay payment request. */
export type ShopPayPaymentRequestLineItemInput = {
  /** The final item price for the line item. */
  finalItemPrice?: InputMaybe<MoneyInput>;
  /** The final line price for the line item. */
  finalLinePrice?: InputMaybe<MoneyInput>;
  /** The image of the line item. */
  image?: InputMaybe<ShopPayPaymentRequestImageInput>;
  /**
   * The item discounts for the line item.
   *
   * The input must not contain more than `250` values.
   */
  itemDiscounts?: InputMaybe<Array<ShopPayPaymentRequestDiscountInput>>;
  /** The label of the line item. */
  label?: InputMaybe<Scalars['String']['input']>;
  /**
   * The line discounts for the line item.
   *
   * The input must not contain more than `250` values.
   */
  lineDiscounts?: InputMaybe<Array<ShopPayPaymentRequestDiscountInput>>;
  /** The original item price for the line item. */
  originalItemPrice?: InputMaybe<MoneyInput>;
  /** The original line price for the line item. */
  originalLinePrice?: InputMaybe<MoneyInput>;
  /** The quantity of the line item. */
  quantity: Scalars['Int']['input'];
  /** Whether the line item requires shipping. */
  requiresShipping?: InputMaybe<Scalars['Boolean']['input']>;
  /** The SKU of the line item. */
  sku?: InputMaybe<Scalars['String']['input']>;
};

/** Represents a receipt for a Shop Pay payment request. */
export type ShopPayPaymentRequestReceipt = {
  __typename?: 'ShopPayPaymentRequestReceipt';
  /** The payment request object. */
  paymentRequest: ShopPayPaymentRequest;
  /** The processing status. */
  processingStatusType: Scalars['String']['output'];
  /** The token of the receipt. */
  token: Scalars['String']['output'];
};

/** Represents a Shop Pay payment request session. */
export type ShopPayPaymentRequestSession = {
  __typename?: 'ShopPayPaymentRequestSession';
  /** The checkout URL of the Shop Pay payment request session. */
  checkoutUrl: Scalars['URL']['output'];
  /** The payment request associated with the Shop Pay payment request session. */
  paymentRequest: ShopPayPaymentRequest;
  /** The source identifier of the Shop Pay payment request session. */
  sourceIdentifier: Scalars['String']['output'];
  /** The token of the Shop Pay payment request session. */
  token: Scalars['String']['output'];
};

/** Return type for `shopPayPaymentRequestSessionCreate` mutation. */
export type ShopPayPaymentRequestSessionCreatePayload = {
  __typename?: 'ShopPayPaymentRequestSessionCreatePayload';
  /** The new Shop Pay payment request session object. */
  shopPayPaymentRequestSession?: Maybe<ShopPayPaymentRequestSession>;
  /** Error codes for failed Shop Pay payment request session mutations. */
  userErrors: Array<UserErrorsShopPayPaymentRequestSessionUserErrors>;
};

/** Return type for `shopPayPaymentRequestSessionSubmit` mutation. */
export type ShopPayPaymentRequestSessionSubmitPayload = {
  __typename?: 'ShopPayPaymentRequestSessionSubmitPayload';
  /** The checkout on which the payment was applied. */
  paymentRequestReceipt?: Maybe<ShopPayPaymentRequestReceipt>;
  /** Error codes for failed Shop Pay payment request session mutations. */
  userErrors: Array<UserErrorsShopPayPaymentRequestSessionUserErrors>;
};

/** Represents a shipping line for a Shop Pay payment request. */
export type ShopPayPaymentRequestShippingLine = {
  __typename?: 'ShopPayPaymentRequestShippingLine';
  /** The amount for the shipping line. */
  amount: MoneyV2;
  /** The code of the shipping line. */
  code: Scalars['String']['output'];
  /** The label of the shipping line. */
  label: Scalars['String']['output'];
};

/** The input fields to create a shipping line for a Shop Pay payment request. */
export type ShopPayPaymentRequestShippingLineInput = {
  /** The amount for the shipping line. */
  amount?: InputMaybe<MoneyInput>;
  /** The code of the shipping line. */
  code?: InputMaybe<Scalars['String']['input']>;
  /** The label of the shipping line. */
  label?: InputMaybe<Scalars['String']['input']>;
};

/** Represents a shipping total for a Shop Pay payment request. */
export type ShopPayPaymentRequestTotalShippingPrice = {
  __typename?: 'ShopPayPaymentRequestTotalShippingPrice';
  /** The discounts for the shipping total. */
  discounts: Array<ShopPayPaymentRequestDiscount>;
  /** The final total for the shipping total. */
  finalTotal: MoneyV2;
  /** The original total for the shipping total. */
  originalTotal?: Maybe<MoneyV2>;
};

/** The input fields to create a shipping total for a Shop Pay payment request. */
export type ShopPayPaymentRequestTotalShippingPriceInput = {
  /**
   * The discounts for the shipping total.
   *
   * The input must not contain more than `250` values.
   */
  discounts?: InputMaybe<Array<ShopPayPaymentRequestDiscountInput>>;
  /** The final total for the shipping total. */
  finalTotal?: InputMaybe<MoneyInput>;
  /** The original total for the shipping total. */
  originalTotal?: InputMaybe<MoneyInput>;
};

/**
 * The input fields for submitting Shop Pay payment method information for checkout.
 *
 */
export type ShopPayWalletContentInput = {
  /** The customer's billing address. */
  billingAddress: MailingAddressInput;
  /** Session token for transaction. */
  sessionToken: Scalars['String']['input'];
};

/** Policy that a merchant has configured for their store, such as their refund or privacy policy. */
export type ShopPolicy = Node & {
  __typename?: 'ShopPolicy';
  /** Policy text, maximum size of 64kb. */
  body: Scalars['String']['output'];
  /** Policy’s handle. */
  handle: Scalars['String']['output'];
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** Policy’s title. */
  title: Scalars['String']['output'];
  /** Public URL to the policy. */
  url: Scalars['URL']['output'];
};

/**
 * A policy for the store that comes with a default value, such as a subscription policy.
 * If the merchant hasn't configured a policy for their store, then the policy will return the default value.
 * Otherwise, the policy will return the merchant-configured value.
 *
 */
export type ShopPolicyWithDefault = {
  __typename?: 'ShopPolicyWithDefault';
  /** The text of the policy. Maximum size: 64KB. */
  body: Scalars['String']['output'];
  /** The handle of the policy. */
  handle: Scalars['String']['output'];
  /** The unique ID of the policy. A default policy doesn't have an ID. */
  id?: Maybe<Scalars['ID']['output']>;
  /** The title of the policy. */
  title: Scalars['String']['output'];
  /** Public URL to the policy. */
  url: Scalars['URL']['output'];
};

/** Contains all fields required to generate sitemaps. */
export type Sitemap = {
  __typename?: 'Sitemap';
  /** The number of sitemap's pages for a given type. */
  pagesCount?: Maybe<Count>;
  /**
   * A list of sitemap's resources for a given type.
   *
   * Important Notes:
   *   - The number of items per page varies from 0 to 250.
   *   - Empty pages (0 items) may occur and do not necessarily indicate the end of results.
   *   - Always check `hasNextPage` to determine if more pages are available.
   *
   */
  resources?: Maybe<PaginatedSitemapResources>;
};

/** Contains all fields required to generate sitemaps. */
export type SitemapResourcesArgs = {
  page: Scalars['Int']['input'];
};

/** Represents a sitemap's image. */
export type SitemapImage = {
  __typename?: 'SitemapImage';
  /** Image's alt text. */
  alt?: Maybe<Scalars['String']['output']>;
  /** Path to the image. */
  filepath?: Maybe<Scalars['String']['output']>;
  /** The date and time when the image was updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/** Represents a sitemap resource that is not a metaobject. */
export type SitemapResource = SitemapResourceInterface & {
  __typename?: 'SitemapResource';
  /** Resource's handle. */
  handle: Scalars['String']['output'];
  /** Resource's image. */
  image?: Maybe<SitemapImage>;
  /** Resource's title. */
  title?: Maybe<Scalars['String']['output']>;
  /** The date and time when the resource was updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/** Represents the common fields for all sitemap resource types. */
export type SitemapResourceInterface = {
  /** Resource's handle. */
  handle: Scalars['String']['output'];
  /** The date and time when the resource was updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/**
 * A SitemapResourceMetaobject represents a metaobject with
 * [the `renderable` capability](https://shopify.dev/docs/apps/build/custom-data/metaobjects/use-metaobject-capabilities#render-metaobjects-as-web-pages).
 *
 */
export type SitemapResourceMetaobject = SitemapResourceInterface & {
  __typename?: 'SitemapResourceMetaobject';
  /** Resource's handle. */
  handle: Scalars['String']['output'];
  /** The URL handle for accessing pages of this metaobject type in the Online Store. */
  onlineStoreUrlHandle?: Maybe<Scalars['String']['output']>;
  /** The type of the metaobject. */
  type: Scalars['String']['output'];
  /** The date and time when the resource was updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/** The types of resources potentially present in a sitemap. */
export type SitemapType =
  /** Articles present in the sitemap. */
  | 'ARTICLE'
  /** Blogs present in the sitemap. */
  | 'BLOG'
  /** Collections present in the sitemap. */
  | 'COLLECTION'
  /**
   * Metaobjects present in the sitemap. Only metaobject types with the
   * [`renderable` capability](https://shopify.dev/docs/apps/build/custom-data/metaobjects/use-metaobject-capabilities#render-metaobjects-as-web-pages)
   * are included in sitemap.
   *
   */
  | 'METAOBJECT'
  /** Pages present in the sitemap. */
  | 'PAGE'
  /** Products present in the sitemap. */
  | 'PRODUCT';

/** A social login provider for customer accounts. */
export type SocialLoginProvider = {
  __typename?: 'SocialLoginProvider';
  /** The handle of the social login provider. */
  handle: Scalars['String']['output'];
};

/**
 * Inventory information for a product variant at a physical store location that offers local pickup. Includes stock availability, quantity on hand, and estimated pickup readiness time.
 *
 * Local pickup must be [enabled in the store's shipping settings](https://help.shopify.com/manual/shipping/setting-up-and-managing-your-shipping/local-methods/local-pickup) for this data to be returned. Results can be sorted by proximity to a customer's location using the `near` argument on the [`ProductVariant.storeAvailability`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant#field-ProductVariant.fields.storeAvailability) connection.
 *
 * Learn more about [supporting local pickup on storefronts](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/local-pickup).
 *
 */
export type StoreAvailability = {
  __typename?: 'StoreAvailability';
  /** Whether the product variant is in-stock at this location. */
  available: Scalars['Boolean']['output'];
  /** The location where this product variant is stocked at. */
  location: Location;
  /** Returns the estimated amount of time it takes for pickup to be ready (Example: Usually ready in 24 hours). */
  pickUpTime: Scalars['String']['output'];
  /** The quantity of the product variant in-stock at this location. */
  quantityAvailable: Scalars['Int']['output'];
};

/**
 * An auto-generated type for paginating through multiple StoreAvailabilities.
 *
 */
export type StoreAvailabilityConnection = {
  __typename?: 'StoreAvailabilityConnection';
  /** A list of edges. */
  edges: Array<StoreAvailabilityEdge>;
  /** A list of the nodes contained in StoreAvailabilityEdge. */
  nodes: Array<StoreAvailability>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one StoreAvailability and a cursor during pagination.
 *
 */
export type StoreAvailabilityEdge = {
  __typename?: 'StoreAvailabilityEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of StoreAvailabilityEdge. */
  node: StoreAvailability;
};

/**
 * An auto-generated type for paginating through multiple Strings.
 *
 */
export type StringConnection = {
  __typename?: 'StringConnection';
  /** A list of edges. */
  edges: Array<StringEdge>;
  /** A list of the nodes contained in StringEdge. */
  nodes: Array<Scalars['String']['output']>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one String and a cursor during pagination.
 *
 */
export type StringEdge = {
  __typename?: 'StringEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of StringEdge. */
  node: Scalars['String']['output'];
};

/** An error that occurred during cart submit for completion. */
export type SubmissionError = {
  __typename?: 'SubmissionError';
  /** The error code. */
  code: SubmissionErrorCode;
  /** The error message. */
  message?: Maybe<Scalars['String']['output']>;
};

/** The code of the error that occurred during cart submit for completion. */
export type SubmissionErrorCode =
  | 'BUYER_IDENTITY_EMAIL_IS_INVALID'
  | 'BUYER_IDENTITY_EMAIL_REQUIRED'
  | 'BUYER_IDENTITY_PHONE_IS_INVALID'
  | 'DELIVERY_ADDRESS1_INVALID'
  | 'DELIVERY_ADDRESS1_REQUIRED'
  | 'DELIVERY_ADDRESS1_TOO_LONG'
  | 'DELIVERY_ADDRESS2_INVALID'
  | 'DELIVERY_ADDRESS2_REQUIRED'
  | 'DELIVERY_ADDRESS2_TOO_LONG'
  | 'DELIVERY_ADDRESS_REQUIRED'
  | 'DELIVERY_CITY_INVALID'
  | 'DELIVERY_CITY_REQUIRED'
  | 'DELIVERY_CITY_TOO_LONG'
  | 'DELIVERY_COMPANY_INVALID'
  | 'DELIVERY_COMPANY_REQUIRED'
  | 'DELIVERY_COMPANY_TOO_LONG'
  | 'DELIVERY_COUNTRY_REQUIRED'
  | 'DELIVERY_FIRST_NAME_INVALID'
  | 'DELIVERY_FIRST_NAME_REQUIRED'
  | 'DELIVERY_FIRST_NAME_TOO_LONG'
  | 'DELIVERY_INVALID_POSTAL_CODE_FOR_COUNTRY'
  | 'DELIVERY_INVALID_POSTAL_CODE_FOR_ZONE'
  | 'DELIVERY_LAST_NAME_INVALID'
  | 'DELIVERY_LAST_NAME_REQUIRED'
  | 'DELIVERY_LAST_NAME_TOO_LONG'
  | 'DELIVERY_NO_DELIVERY_AVAILABLE'
  | 'DELIVERY_NO_DELIVERY_AVAILABLE_FOR_MERCHANDISE_LINE'
  | 'DELIVERY_OPTIONS_PHONE_NUMBER_INVALID'
  | 'DELIVERY_OPTIONS_PHONE_NUMBER_REQUIRED'
  | 'DELIVERY_PHONE_NUMBER_INVALID'
  | 'DELIVERY_PHONE_NUMBER_REQUIRED'
  | 'DELIVERY_POSTAL_CODE_INVALID'
  | 'DELIVERY_POSTAL_CODE_REQUIRED'
  | 'DELIVERY_ZONE_NOT_FOUND'
  | 'DELIVERY_ZONE_REQUIRED_FOR_COUNTRY'
  | 'ERROR'
  | 'MERCHANDISE_LINE_LIMIT_REACHED'
  | 'MERCHANDISE_NOT_APPLICABLE'
  | 'MERCHANDISE_NOT_ENOUGH_STOCK_AVAILABLE'
  | 'MERCHANDISE_OUT_OF_STOCK'
  | 'MERCHANDISE_PRODUCT_NOT_PUBLISHED'
  | 'NO_DELIVERY_GROUP_SELECTED'
  | 'PAYMENTS_ADDRESS1_INVALID'
  | 'PAYMENTS_ADDRESS1_REQUIRED'
  | 'PAYMENTS_ADDRESS1_TOO_LONG'
  | 'PAYMENTS_ADDRESS2_INVALID'
  | 'PAYMENTS_ADDRESS2_REQUIRED'
  | 'PAYMENTS_ADDRESS2_TOO_LONG'
  | 'PAYMENTS_BILLING_ADDRESS_ZONE_NOT_FOUND'
  | 'PAYMENTS_BILLING_ADDRESS_ZONE_REQUIRED_FOR_COUNTRY'
  | 'PAYMENTS_CITY_INVALID'
  | 'PAYMENTS_CITY_REQUIRED'
  | 'PAYMENTS_CITY_TOO_LONG'
  | 'PAYMENTS_COMPANY_INVALID'
  | 'PAYMENTS_COMPANY_REQUIRED'
  | 'PAYMENTS_COMPANY_TOO_LONG'
  | 'PAYMENTS_COUNTRY_REQUIRED'
  | 'PAYMENTS_CREDIT_CARD_BASE_EXPIRED'
  | 'PAYMENTS_CREDIT_CARD_BASE_GATEWAY_NOT_SUPPORTED'
  | 'PAYMENTS_CREDIT_CARD_BASE_INVALID_START_DATE_OR_ISSUE_NUMBER_FOR_DEBIT'
  | 'PAYMENTS_CREDIT_CARD_BRAND_NOT_SUPPORTED'
  | 'PAYMENTS_CREDIT_CARD_FIRST_NAME_BLANK'
  | 'PAYMENTS_CREDIT_CARD_GENERIC'
  | 'PAYMENTS_CREDIT_CARD_LAST_NAME_BLANK'
  | 'PAYMENTS_CREDIT_CARD_MONTH_INCLUSION'
  | 'PAYMENTS_CREDIT_CARD_NAME_INVALID'
  | 'PAYMENTS_CREDIT_CARD_NUMBER_INVALID'
  | 'PAYMENTS_CREDIT_CARD_NUMBER_INVALID_FORMAT'
  | 'PAYMENTS_CREDIT_CARD_SESSION_ID'
  | 'PAYMENTS_CREDIT_CARD_VERIFICATION_VALUE_BLANK'
  | 'PAYMENTS_CREDIT_CARD_VERIFICATION_VALUE_INVALID_FOR_CARD_TYPE'
  | 'PAYMENTS_CREDIT_CARD_YEAR_EXPIRED'
  | 'PAYMENTS_CREDIT_CARD_YEAR_INVALID_EXPIRY_YEAR'
  | 'PAYMENTS_FIRST_NAME_INVALID'
  | 'PAYMENTS_FIRST_NAME_REQUIRED'
  | 'PAYMENTS_FIRST_NAME_TOO_LONG'
  | 'PAYMENTS_INVALID_POSTAL_CODE_FOR_COUNTRY'
  | 'PAYMENTS_INVALID_POSTAL_CODE_FOR_ZONE'
  | 'PAYMENTS_LAST_NAME_INVALID'
  | 'PAYMENTS_LAST_NAME_REQUIRED'
  | 'PAYMENTS_LAST_NAME_TOO_LONG'
  | 'PAYMENTS_METHOD_REQUIRED'
  | 'PAYMENTS_METHOD_UNAVAILABLE'
  | 'PAYMENTS_PHONE_NUMBER_INVALID'
  | 'PAYMENTS_PHONE_NUMBER_REQUIRED'
  | 'PAYMENTS_POSTAL_CODE_INVALID'
  | 'PAYMENTS_POSTAL_CODE_REQUIRED'
  | 'PAYMENTS_SHOPIFY_PAYMENTS_REQUIRED'
  | 'PAYMENTS_UNACCEPTABLE_PAYMENT_AMOUNT'
  | 'PAYMENTS_WALLET_CONTENT_MISSING'
  /** Redirect to checkout required to complete this action. */
  | 'REDIRECT_TO_CHECKOUT_REQUIRED'
  | 'TAXES_DELIVERY_GROUP_ID_NOT_FOUND'
  | 'TAXES_LINE_ID_NOT_FOUND'
  | 'TAXES_MUST_BE_DEFINED'
  /** Validation failed. */
  | 'VALIDATION_CUSTOM';

/** Cart submit for checkout completion is successful. */
export type SubmitAlreadyAccepted = {
  __typename?: 'SubmitAlreadyAccepted';
  /** The ID of the cart completion attempt that will be used for polling for the result. */
  attemptId: Scalars['String']['output'];
};

/** Cart submit for checkout completion failed. */
export type SubmitFailed = {
  __typename?: 'SubmitFailed';
  /** The URL of the checkout for the cart. */
  checkoutUrl?: Maybe<Scalars['URL']['output']>;
  /** The list of errors that occurred from executing the mutation. */
  errors: Array<SubmissionError>;
};

/** Cart submit for checkout completion is already accepted. */
export type SubmitSuccess = {
  __typename?: 'SubmitSuccess';
  /** The ID of the cart completion attempt that will be used for polling for the result. */
  attemptId: Scalars['String']['output'];
  /** The url to which the buyer should be redirected after the cart is successfully submitted. */
  redirectUrl: Scalars['URL']['output'];
};

/** Cart submit for checkout completion is throttled. */
export type SubmitThrottled = {
  __typename?: 'SubmitThrottled';
  /**
   * UTC date time string that indicates the time after which clients should make their next
   * poll request. Any poll requests sent before this time will be ignored. Use this value to schedule the
   * next poll request.
   *
   */
  pollAfter: Scalars['DateTime']['output'];
};

/**
 * A visual representation for filter values, containing a color, an image, or both. The [`FilterValue`](https://shopify.dev/docs/api/storefront/current/objects/FilterValue) object's [`swatch`](https://shopify.dev/docs/api/storefront/current/objects/FilterValue#field-FilterValue.fields.swatch) field returns this when the filter's presentation is set to `SWATCH`.
 *
 */
export type Swatch = {
  __typename?: 'Swatch';
  /** The swatch color. */
  color?: Maybe<Scalars['Color']['output']>;
  /** The swatch image. */
  image?: Maybe<MediaImage>;
};

/**
 * A category from Shopify's [Standard Product Taxonomy](https://shopify.github.io/product-taxonomy/releases/unstable/?categoryId=sg-4-17-2-17) assigned to a [`Product`](https://shopify.dev/docs/api/storefront/current/objects/Product). Categories provide hierarchical classification through the `ancestors` field.
 *
 * The [`ancestors`](https://shopify.dev/docs/api/storefront/current/objects/TaxonomyCategory#field-TaxonomyCategory.fields.ancestors) field returns the parent chain from the immediate parent up to the root. Each ancestor category also includes its own `ancestors`.
 *
 * The [`name`](https://shopify.dev/docs/api/storefront/latest/objects/TaxonomyCategory#field-TaxonomyCategory.fields.name) field returns the localized category name based on the storefront's request language with shop locale fallbacks. If a translation isn't available for the resolved locale, the English taxonomy name is returned.
 *
 */
export type TaxonomyCategory = Node & {
  __typename?: 'TaxonomyCategory';
  /** All parent nodes of the current taxonomy category. */
  ancestors: Array<TaxonomyCategory>;
  /** A static identifier for the taxonomy category. */
  id: Scalars['ID']['output'];
  /** The localized name of the taxonomy category. */
  name: Scalars['String']['output'];
};

/**
 * A filter used to view a subset of products in a collection matching a specific taxonomy metafield value.
 *
 */
export type TaxonomyMetafieldFilter = {
  /** The key of the metafield to filter on. */
  key: Scalars['String']['input'];
  /** The namespace of the metafield to filter on. */
  namespace: Scalars['String']['input'];
  /** The value of the metafield. */
  value: Scalars['String']['input'];
};

/** Represents a resource that you can track the origin of the search traffic. */
export type Trackable = {
  /** URL parameters to be added to a page URL to track the origin of on-site search traffic for [analytics reporting](https://help.shopify.com/manual/reports-and-analytics/shopify-reports/report-types/default-reports/behaviour-reports). Returns a result when accessed through the [search](https://shopify.dev/docs/api/storefront/current/queries/search) or [predictiveSearch](https://shopify.dev/docs/api/storefront/current/queries/predictiveSearch) queries, otherwise returns null. */
  trackingParameters?: Maybe<Scalars['String']['output']>;
};

/** Translation represents a translation of a key-value pair. */
export type Translation = {
  __typename?: 'Translation';
  /** The key of the translation. */
  key: Scalars['String']['output'];
  /** The value of the translation. */
  value: Scalars['String']['output'];
};

/**
 * The measurement data used to calculate unit prices for a [`ProductVariant`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant). Unit pricing helps customers compare costs across different package sizes by showing a standardized price, such as "$9.99 / 100ml".
 *
 * The object includes the quantity being sold (value and unit) and the reference measurement used for price comparison. Use this alongside the variant's [`unitPrice`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant#field-ProductVariant.fields.unitPrice) field to display complete unit pricing information.
 *
 */
export type UnitPriceMeasurement = {
  __typename?: 'UnitPriceMeasurement';
  /** The type of unit of measurement for the unit price measurement. */
  measuredType?: Maybe<UnitPriceMeasurementMeasuredType>;
  /** The quantity unit for the unit price measurement. */
  quantityUnit?: Maybe<UnitPriceMeasurementMeasuredUnit>;
  /** The quantity value for the unit price measurement. */
  quantityValue: Scalars['Float']['output'];
  /** The reference unit for the unit price measurement. */
  referenceUnit?: Maybe<UnitPriceMeasurementMeasuredUnit>;
  /** The reference value for the unit price measurement. */
  referenceValue: Scalars['Int']['output'];
};

/** The accepted types of unit of measurement. */
export type UnitPriceMeasurementMeasuredType =
  /** Unit of measurements representing areas. */
  | 'AREA'
  /** Unit of measurements representing counts. */
  | 'COUNT'
  /** Unit of measurements representing lengths. */
  | 'LENGTH'
  /** The type of measurement is unknown. Upgrade to the latest version of the API to resolve this type. */
  | 'UNKNOWN'
  /** Unit of measurements representing volumes. */
  | 'VOLUME'
  /** Unit of measurements representing weights. */
  | 'WEIGHT';

/** The valid units of measurement for a unit price measurement. */
export type UnitPriceMeasurementMeasuredUnit =
  /** 100 centiliters equals 1 liter. */
  | 'CL'
  /** 100 centimeters equals 1 meter. */
  | 'CM'
  /** Imperial system unit of volume (U.S. customary unit). */
  | 'FLOZ'
  /** 1 foot equals 12 inches. */
  | 'FT'
  /** Imperial system unit of area. */
  | 'FT2'
  /** Metric system unit of weight. */
  | 'G'
  /** 1 gallon equals 128 fluid ounces (U.S. customary unit). */
  | 'GAL'
  /** Imperial system unit of length. */
  | 'IN'
  /** 1 item, a unit of count. */
  | 'ITEM'
  /** 1 kilogram equals 1000 grams. */
  | 'KG'
  /** Metric system unit of volume. */
  | 'L'
  /** Imperial system unit of weight. */
  | 'LB'
  /** Metric system unit of length. */
  | 'M'
  /** Metric system unit of area. */
  | 'M2'
  /** 1 cubic meter equals 1000 liters. */
  | 'M3'
  /** 1000 milligrams equals 1 gram. */
  | 'MG'
  /** 1000 milliliters equals 1 liter. */
  | 'ML'
  /** 1000 millimeters equals 1 meter. */
  | 'MM'
  /** 16 ounces equals 1 pound. */
  | 'OZ'
  /** 1 pint equals 16 fluid ounces (U.S. customary unit). */
  | 'PT'
  /** 1 quart equals 32 fluid ounces (U.S. customary unit). */
  | 'QT'
  /** The unit of measurement is unknown. Upgrade to the latest version of the API to resolve this unit. */
  | 'UNKNOWN'
  /** 1 yard equals 36 inches. */
  | 'YD';

/** Systems of weights and measures. */
export type UnitSystem =
  /** Imperial system of weights and measures. */
  | 'IMPERIAL_SYSTEM'
  /** Metric system of weights and measures. */
  | 'METRIC_SYSTEM';

/** A redirect on the online store. */
export type UrlRedirect = Node & {
  __typename?: 'UrlRedirect';
  /** The ID of the URL redirect. */
  id: Scalars['ID']['output'];
  /** The old path to be redirected from. When the user visits this path, they'll be redirected to the target location. */
  path: Scalars['String']['output'];
  /** The target location where the user will be redirected to. */
  target: Scalars['String']['output'];
};

/**
 * An auto-generated type for paginating through multiple UrlRedirects.
 *
 */
export type UrlRedirectConnection = {
  __typename?: 'UrlRedirectConnection';
  /** A list of edges. */
  edges: Array<UrlRedirectEdge>;
  /** A list of the nodes contained in UrlRedirectEdge. */
  nodes: Array<UrlRedirect>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/**
 * An auto-generated type which holds one UrlRedirect and a cursor during pagination.
 *
 */
export type UrlRedirectEdge = {
  __typename?: 'UrlRedirectEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of UrlRedirectEdge. */
  node: UrlRedirect;
};

/** Represents an error in the input of a mutation. */
export type UserError = DisplayableError & {
  __typename?: 'UserError';
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Error codes for failed Shop Pay payment request session mutations. */
export type UserErrorsShopPayPaymentRequestSessionUserErrors =
  DisplayableError & {
    __typename?: 'UserErrorsShopPayPaymentRequestSessionUserErrors';
    /** The error code. */
    code?: Maybe<UserErrorsShopPayPaymentRequestSessionUserErrorsCode>;
    /** The path to the input field that caused the error. */
    field?: Maybe<Array<Scalars['String']['output']>>;
    /** The error message. */
    message: Scalars['String']['output'];
  };

/** Possible error codes that can be returned by `ShopPayPaymentRequestSessionUserErrors`. */
export type UserErrorsShopPayPaymentRequestSessionUserErrorsCode =
  /** Idempotency key has already been used. */
  | 'IDEMPOTENCY_KEY_ALREADY_USED'
  /** Payment request input is invalid. */
  | 'PAYMENT_REQUEST_INVALID_INPUT'
  /** Payment request not found. */
  | 'PAYMENT_REQUEST_NOT_FOUND';

/** The input fields for a filter used to view a subset of products in a collection matching a specific variant option. */
export type VariantOptionFilter = {
  /** The name of the variant option to filter on. */
  name: Scalars['String']['input'];
  /** The value of the variant option to filter on. */
  value: Scalars['String']['input'];
};

/**
 * A video hosted on Shopify's servers. Implements the [`Media`](https://shopify.dev/docs/api/storefront/current/interfaces/Media) interface and provides multiple video sources through the [`sources`](https://shopify.dev/docs/api/storefront/current/objects/Video#field-Video.fields.sources) field, each with [format](https://shopify.dev/docs/api/storefront/current/objects/Video#field-Video.fields.sources.format), dimensions, and [URL information](https://shopify.dev/docs/api/storefront/current/objects/Video#field-Video.fields.sources.url) for adaptive playback.
 *
 * For videos hosted on external platforms like YouTube or Vimeo, use [`ExternalVideo`](https://shopify.dev/docs/api/storefront/current/objects/ExternalVideo) instead.
 *
 */
export type Video = Media &
  Node & {
    __typename?: 'Video';
    /** A word or phrase to share the nature or contents of a media. */
    alt?: Maybe<Scalars['String']['output']>;
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
    /** The media content type. */
    mediaContentType: MediaContentType;
    /** The presentation for a media. */
    presentation?: Maybe<MediaPresentation>;
    /** The preview image for the media. */
    previewImage?: Maybe<Image>;
    /** The sources for a video. */
    sources: Array<VideoSource>;
  };

/** Represents a source for a Shopify hosted video. */
export type VideoSource = {
  __typename?: 'VideoSource';
  /** The format of the video source. */
  format: Scalars['String']['output'];
  /** The height of the video. */
  height: Scalars['Int']['output'];
  /** The video MIME type. */
  mimeType: Scalars['String']['output'];
  /** The URL of the video. */
  url: Scalars['String']['output'];
  /** The width of the video. */
  width: Scalars['Int']['output'];
};

/** The visitor's consent to data processing purposes for the shop. true means accepting the purposes, false means declining them, and null means that the visitor didn't express a preference. */
export type VisitorConsent = {
  /** The visitor accepts or rejects the analytics data processing purpose. */
  analytics?: InputMaybe<Scalars['Boolean']['input']>;
  /** The visitor accepts or rejects the first and third party marketing data processing purposes. */
  marketing?: InputMaybe<Scalars['Boolean']['input']>;
  /** The visitor accepts or rejects the preferences data processing purpose. */
  preferences?: InputMaybe<Scalars['Boolean']['input']>;
  /** The visitor accepts or rejects the sale or sharing of their data with third parties. */
  saleOfData?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * Units of measurement for weight, supporting both metric and imperial systems. Used by [`ProductVariant`](https://shopify.dev/docs/api/storefront/current/objects/ProductVariant) to specify the unit for the variant's weight value.
 *
 */
export type WeightUnit =
  /** Metric system unit of mass. */
  | 'GRAMS'
  /** 1 kilogram equals 1000 grams. */
  | 'KILOGRAMS'
  /** Imperial system unit of mass. */
  | 'OUNCES'
  /** 1 pound equals 16 ounces. */
  | 'POUNDS';
