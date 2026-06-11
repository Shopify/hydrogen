import { gql } from "@shopify/hydrogen";
import { Link } from "react-router";

import { storefrontClientContext } from "../lib/storefront";
import type { Route } from "./+types/news";

const NEWS_QUERY = gql(`
  query News {
    blog(handle: "news") {
      articles(first: 10) {
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

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

export function meta() {
  return [{ title: "News — Mock.shop" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const { data } = await storefrontClient.graphql(NEWS_QUERY);
  if (!data?.blog) {
    throw new Response("Blog not found", { status: 404 });
  }
  return { articles: data.blog.articles.nodes };
}

export default function News({ loaderData }: Route.ComponentProps) {
  const { articles } = loaderData;
  const [featured, ...rest] = articles;

  return (
    <main className="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
      <header>
        <h1 className="text-6xl font-black tracking-tight md:text-8xl">News</h1>
      </header>

      <section className="mt-16 space-y-6">
        {featured && (
          <Link
            to={`/blogs/news/${featured.handle}`}
            className="group block border border-black/15 p-8 transition-colors hover:border-black md:p-10"
          >
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{featured.title}</h2>
            <p className="mt-2 text-sm text-black/60">
              {dateFormatter.format(new Date(featured.publishedAt))}
            </p>
            <p className="mt-6 text-base leading-relaxed text-black/80">{featured.excerpt}</p>
            <p className="mt-8 text-sm font-medium text-black/70 group-hover:text-black">
              Read more...
            </p>
          </Link>
        )}

        {rest.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {rest.map((article) => (
              <Link
                key={article.handle}
                to={`/blogs/news/${article.handle}`}
                className="group block border border-black/15 p-8 transition-colors hover:border-black"
              >
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">{article.title}</h2>
                <p className="mt-2 text-sm text-black/60">
                  {dateFormatter.format(new Date(article.publishedAt))}
                </p>
                <p className="mt-6 text-base leading-relaxed text-black/80">{article.excerpt}</p>
                <p className="mt-8 text-sm font-medium text-black/70 group-hover:text-black">
                  Read more...
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
