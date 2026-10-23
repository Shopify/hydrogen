import { createController } from "remix/router";

import { BROWSING_HEADERS } from "../../lib/cache-control.ts";
import { getPaginationVariables } from "../../lib/pagination.ts";
import { redirectIfHandleIsLocalized } from "../../lib/redirect.ts";
import { contentCache, requireData } from "../../lib/storefront.ts";
import { routes } from "../../routes.ts";
import { NotFoundPage } from "../../ui/error-pages.tsx";
import {
  ARTICLE_QUERY,
  ArticlePage,
  BLOG_QUERY,
  BLOGS_QUERY,
  BlogPage,
  BlogsPage,
} from "./pages.tsx";

export default createController(routes.blogs, {
  actions: {
    async index({ locale, render, request, shopify, url }) {
      const result = await shopify.storefront.graphql(BLOGS_QUERY, {
        cache: contentCache(),
        variables: getPaginationVariables(url, { pageBy: 10 }),
      });
      return render(
        <BlogsPage
          blogs={requireData(result).blogs}
          pathPrefix={locale.pathPrefix}
          url={new URL(request.url)}
        />,
        { headers: BROWSING_HEADERS },
      );
    },

    async show({ locale, params, render, request, shopify, url }) {
      const result = await shopify.storefront.graphql(BLOG_QUERY, {
        cache: contentCache(),
        variables: { blogHandle: params.blogHandle, ...getPaginationVariables(url, { pageBy: 4 }) },
      });
      const blog = requireData(result).blog;
      if (!blog?.articles) {
        return render(<NotFoundPage pathname={new URL(request.url).pathname} />, { status: 404 });
      }

      return (
        redirectIfHandleIsLocalized(request, { handle: params.blogHandle, data: blog }) ??
        render(<BlogPage blog={blog} pathPrefix={locale.pathPrefix} url={new URL(request.url)} />, {
          headers: BROWSING_HEADERS,
        })
      );
    },

    async article({ params, render, request, shopify }) {
      const result = await shopify.storefront.graphql(ARTICLE_QUERY, {
        cache: contentCache(),
        variables: { blogHandle: params.blogHandle, articleHandle: params.articleHandle },
      });
      const blog = requireData(result).blog;
      const article = blog?.articleByHandle;
      if (!blog || !article) {
        return render(<NotFoundPage pathname={new URL(request.url).pathname} />, { status: 404 });
      }

      return (
        redirectIfHandleIsLocalized(
          request,
          { handle: params.articleHandle, data: article },
          { handle: params.blogHandle, data: blog },
        ) ?? render(<ArticlePage article={article} />, { headers: BROWSING_HEADERS })
      );
    },
  },
});
