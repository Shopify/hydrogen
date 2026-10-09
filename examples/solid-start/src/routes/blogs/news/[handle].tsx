import { gql } from "@shopify/hydrogen";
import { Title } from "@solidjs/meta";
import { A, createAsync, query, useParams, type RouteDefinition } from "@solidjs/router";
import { Show } from "solid-js";

import { getRequestStorefrontClient } from "../../../lib/request-storefront";

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

const fetchArticle = query(async (handle: string) => {
  "use server";
  const storefrontClient = getRequestStorefrontClient();
  const { data } = await storefrontClient.graphql(ARTICLE_QUERY, {
    variables: { handle },
  });
  const article = data?.blog?.articleByHandle;
  if (!article) {
    throw new Error(`Article not found: ${handle}`);
  }
  return article;
}, "article");

export const route = {
  preload: ({ params }) => params.handle && fetchArticle(params.handle),
} satisfies RouteDefinition;

export default function ArticlePage() {
  const params = useParams<{ handle: string }>();
  const article = createAsync(() => fetchArticle(params.handle));

  return (
    <main id="main-content" tabIndex={-1} class="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Show when={article()}>
        {(a) => (
          <article>
            <Title>{a().title} — Mock.shop</Title>
            <header class="text-center">
              <h1 class="text-5xl font-black tracking-tight md:text-7xl">{a().title}</h1>
              <p class="mt-6 text-sm text-black/60">
                {dateFormatter.format(new Date(a().publishedAt))}
              </p>
            </header>

            <div
              class="mt-16 text-base leading-relaxed text-black/80 *:first:mt-0 md:text-lg [&>h3]:mt-12 [&>h3]:text-3xl [&>h3]:font-black [&>h3]:tracking-tight [&>h3]:text-black md:[&>h3]:text-4xl [&>p]:mt-6"
              innerHTML={a().contentHtml}
            />

            <div class="mt-20 border-t border-black/10 pt-8">
              <A
                href="/blogs/news"
                class="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-60"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M19 12H5" />
                  <path d="m12 19-7-7 7-7" />
                </svg>
                Back to News
              </A>
            </div>
          </article>
        )}
      </Show>
    </main>
  );
}
