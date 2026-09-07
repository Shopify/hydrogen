import { createFileRoute, Link } from "@tanstack/react-router";

import { getArticle } from "~/server/blog";

export const Route = createFileRoute("/blogs/news/$handle")({
  loader: ({ params }) => getArticle({ data: { handle: params.handle } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.title ?? "Article"} · CORE` }],
  }),
  component: ArticlePage,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

function ArticlePage() {
  const article = Route.useLoaderData();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="px-margin mx-auto w-full max-w-3xl flex-1 py-12"
    >
      <article>
        <header className="text-center">
          <h1 className="type-display text-on-surface">{article.title}</h1>
          <p className="text-on-surface-secondary mt-6 text-sm">
            <time dateTime={article.publishedAt}>
              {dateFormatter.format(new Date(article.publishedAt))}
            </time>
          </p>
        </header>
        {/* Storefront-owned HTML from the Storefront API. */}
        <div
          className="richtext text-on-surface-secondary mt-12 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />
        <div className="border-border mt-16 border-t pt-8">
          <Link
            to="/blogs/news"
            className="text-on-surface inline-flex items-center gap-2 text-sm font-medium no-underline hover:opacity-70"
          >
            <img src="/icons/icon-chevron-left.svg" alt="" className="size-4" aria-hidden="true" />
            Back to news
          </Link>
        </div>
      </article>
    </main>
  );
}
