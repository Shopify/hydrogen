import { gql, type StorefrontApi } from "@shopify/hydrogen";
import { unsafeHTML, type Handle } from "remix/component";

import { localizePath } from "../../lib/public/i18n.ts";
import { Document } from "../../ui/document.tsx";
import { PaginatedResourceSection } from "../../ui/pagination.tsx";
import { Image } from "../../ui/public/image.tsx";

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog
export const BLOGS_QUERY = gql(`
  query Blogs(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    blogs(first: $first, last: $last, before: $startCursor, after: $endCursor) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        title
        handle
        seo {
          title
          description
        }
      }
    }
  }
`);

export const BLOG_QUERY = gql(`
  query Blog(
    $language: LanguageCode
    $blogHandle: String!
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(language: $language) {
    blog(handle: $blogHandle) {
      title
      handle
      seo {
        title
        description
      }
      articles(first: $first, last: $last, before: $startCursor, after: $endCursor) {
        nodes {
          ...ArticleItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
  fragment ArticleItem on Article {
    author: authorV2 {
      name
    }
    handle
    id
    image {
      id
      altText
      url
      width
      height
    }
    publishedAt
    title
    blog {
      handle
    }
  }
`);

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog#field-blog-articlebyhandle
export const ARTICLE_QUERY = gql(`
  query Article(
    $articleHandle: String!
    $blogHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      handle
      articleByHandle(handle: $articleHandle) {
        handle
        title
        contentHtml
        publishedAt
        author: authorV2 {
          name
        }
        image {
          id
          altText
          url
          width
          height
        }
        seo {
          description
          title
        }
      }
    }
  }
`);

type Blogs = StorefrontApi.ResultOf<typeof BLOGS_QUERY>["blogs"];
type Blog = NonNullable<StorefrontApi.ResultOf<typeof BLOG_QUERY>["blog"]>;
type Article = NonNullable<
  NonNullable<StorefrontApi.ResultOf<typeof ARTICLE_QUERY>["blog"]>["articleByHandle"]
>;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function BlogsPage(handle: Handle<{ blogs: Blogs; pathPrefix: string; url: URL }>) {
  return () => {
    const { blogs, pathPrefix, url } = handle.props;
    return (
      <Document title="Hydrogen | Blogs">
        <div class="blogs">
          <h1>Blogs</h1>
          <PaginatedResourceSection
            pageInfo={blogs.pageInfo}
            url={url}
            resourcesClassName="blogs-grid"
          >
            {blogs.nodes.map((blog) => (
              <a
                key={blog.handle}
                class="blog"
                href={localizePath(`/blogs/${blog.handle}`, pathPrefix)}
              >
                <h2>{blog.title}</h2>
              </a>
            ))}
          </PaginatedResourceSection>
        </div>
      </Document>
    );
  };
}

export function BlogPage(handle: Handle<{ blog: Blog; pathPrefix: string; url: URL }>) {
  return () => {
    const { blog, pathPrefix, url } = handle.props;
    return (
      <Document
        title={`Hydrogen | ${blog.seo?.title ?? blog.title} blog`}
        description={blog.seo?.description}
      >
        <div class="blog">
          <h1>{blog.title}</h1>
          <PaginatedResourceSection
            pageInfo={blog.articles.pageInfo}
            url={url}
            resourcesClassName="blog-grid"
          >
            {blog.articles.nodes.map((article, index) => (
              <div class="blog-article" key={article.id}>
                <a
                  href={localizePath(`/blogs/${article.blog.handle}/${article.handle}`, pathPrefix)}
                >
                  {article.image ? (
                    <div class="blog-article-image">
                      <Image
                        data={article.image}
                        alt={article.image.altText || article.title}
                        aspectRatio={3 / 2}
                        loading={index < 2 ? "eager" : "lazy"}
                        sizes="(min-width: 768px) 50vw, 100vw"
                      />
                    </div>
                  ) : null}
                  <h3>{article.title}</h3>
                  <small>{dateFormat.format(new Date(article.publishedAt))}</small>
                </a>
              </div>
            ))}
          </PaginatedResourceSection>
        </div>
      </Document>
    );
  };
}

export function ArticlePage(handle: Handle<{ article: Article }>) {
  return () => {
    const { article } = handle.props;
    return (
      <Document
        title={`Hydrogen | ${article.seo?.title ?? article.title} article`}
        description={article.seo?.description}
      >
        <div class="article">
          <h1>
            {article.title}
            <div>
              <time dateTime={article.publishedAt}>
                {dateFormat.format(new Date(article.publishedAt))}
              </time>{" "}
              &middot; <address>{article.author?.name}</address>
            </div>
          </h1>
          {article.image ? <Image data={article.image} sizes="90vw" loading="eager" /> : null}
          {/* Merchant-authored HTML from the Storefront API. */}
          <div class="article" innerHTML={unsafeHTML(article.contentHtml)} />
        </div>
      </Document>
    );
  };
}
