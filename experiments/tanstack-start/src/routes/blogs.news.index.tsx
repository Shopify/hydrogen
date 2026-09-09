import { createFileRoute, Link } from "@tanstack/react-router";

import { getNews } from "~/server/blog";

export const Route = createFileRoute("/blogs/news/")({
  loader: () => getNews(),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "News"} · CORE` },
      { name: "description", content: "Latest news and stories from CORE." },
    ],
  }),
  component: NewsPage,
});

type Article = Awaited<ReturnType<typeof getNews>>["articles"][number];

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

function ArticleCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  return (
    <article className="card border-border rounded-card group hover:border-on-surface border p-8 motion-safe:transition-colors md:p-10">
      <h2
        className={`text-on-surface font-medium ${featured ? "type-heading-xl" : "type-heading-md"}`}
      >
        <Link
          to="/blogs/news/$handle"
          params={{ handle: article.handle }}
          className="card-link text-on-surface"
        >
          {article.title}
        </Link>
      </h2>
      <p className="text-on-surface-secondary mt-2 text-sm">
        <time dateTime={article.publishedAt}>
          {dateFormatter.format(new Date(article.publishedAt))}
        </time>
      </p>
      {article.excerpt ? (
        <p className="type-body-sm text-on-surface-secondary mt-6 leading-relaxed">
          {article.excerpt}
        </p>
      ) : null}
      <p className="text-on-surface-secondary group-hover:text-on-surface mt-8 text-sm font-medium">
        Read more
      </p>
    </article>
  );
}

function NewsPage() {
  const { title, articles } = Route.useLoaderData();
  const [featured, ...rest] = articles;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="max-w-page px-margin mx-auto w-full flex-1 py-8 md:py-12"
    >
      <h1 className="type-display text-on-surface mb-8">{title}</h1>
      {featured ? (
        <section className="space-y-6" aria-label="Articles">
          <ArticleCard article={featured} featured />
          {rest.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {rest.map((article) => (
                <ArticleCard key={article.handle} article={article} />
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <p className="text-on-surface-secondary">No articles yet.</p>
      )}
    </main>
  );
}
