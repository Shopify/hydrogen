import { gql } from "@shopify/hydrogen";
import { Link } from "react-router";

import { storefrontClientContext } from "../lib/storefront";
import type { Route } from "./+types/article";

const ARTICLE_QUERY = gql(`
  query Article($handle: String!) {
    blog(handle: "news") {
      articleByHandle(handle: $handle) {
        handle
        title
        publishedAt
        contentHtml
      }
    }
  }
`);

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

export function meta({ data }: Route.MetaArgs) {
  const title = data?.article?.title ?? "Article";
  return [{ title: `${title} — Mock.shop` }];
}

export async function loader({ context, params }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const { data } = await storefrontClient.graphql(ARTICLE_QUERY, {
    variables: { handle: params.handle },
  });
  const article = data?.blog?.articleByHandle;
  if (!article) {
    throw new Response("Article not found", { status: 404 });
  }
  return { article };
}

export default function Article({ loaderData }: Route.ComponentProps) {
  const { article } = loaderData;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <article>
        <header className="text-center">
          <h1 className="text-5xl font-black tracking-tight md:text-7xl">{article.title}</h1>
          <p className="mt-6 text-sm text-black/60">
            {dateFormatter.format(new Date(article.publishedAt))}
          </p>
        </header>

        <div
          className="mt-16 text-base leading-relaxed text-black/80 *:first:mt-0 md:text-lg [&>h3]:mt-12 [&>h3]:text-3xl [&>h3]:font-black [&>h3]:tracking-tight [&>h3]:text-black md:[&>h3]:text-4xl [&>p]:mt-6"
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />

        <div className="mt-20 border-t border-black/10 pt-8">
          <Link
            to="/blogs/news"
            className="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-60"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Back to News
          </Link>
        </div>
      </article>
    </main>
  );
}
