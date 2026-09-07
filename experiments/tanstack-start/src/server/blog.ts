import { gql } from "@shopify/hydrogen";

import { articlePath, NEWS_BLOG_HANDLE, newsPath } from "~/lib/route-templates";

import { throwNotFoundOrRedirect } from "./not-found";
import { storefrontFn } from "./storefront-fn";
import { handleInput } from "./validators";

const NEWS_QUERY = gql(`
  query News($blogHandle: String!) {
    blog(handle: $blogHandle) {
      title
      articles(first: 10, sortKey: PUBLISHED_AT, reverse: true) {
        nodes {
          handle
          title
          publishedAt
          excerpt
        }
      }
    }
  }
`);

const ARTICLE_QUERY = gql(`
  query Article($blogHandle: String!, $handle: String!) {
    blog(handle: $blogHandle) {
      articleByHandle(handle: $handle) {
        handle
        title
        publishedAt
        contentHtml
      }
    }
  }
`);

export const getNews = storefrontFn.handler(async ({ context }) => {
  const { storefrontClient } = context;
  const { data } = await storefrontClient.graphql(NEWS_QUERY, {
    variables: { blogHandle: NEWS_BLOG_HANDLE },
  });

  if (!data?.blog) return throwNotFoundOrRedirect(context, newsPath(), "");

  return { title: data.blog.title, articles: data.blog.articles.nodes };
});

export const getArticle = storefrontFn.validator(handleInput).handler(async ({ context, data }) => {
  const { storefrontClient } = context;
  const { data: result } = await storefrontClient.graphql(ARTICLE_QUERY, {
    variables: { blogHandle: NEWS_BLOG_HANDLE, handle: data.handle },
  });
  const article = result?.blog?.articleByHandle;

  if (!article) return throwNotFoundOrRedirect(context, articlePath(data.handle), "");

  return article;
});
