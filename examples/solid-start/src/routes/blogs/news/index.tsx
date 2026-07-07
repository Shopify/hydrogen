import { gql } from "@shopify/hydrogen";
import { Title } from "@solidjs/meta";
import { A, createAsync, query, type RouteDefinition } from "@solidjs/router";
import { For, Show } from "solid-js";

import { getRequestStorefrontClient } from "../../../lib/request-storefront";

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

const fetchNews = query(async () => {
  "use server";
  const storefrontClient = getRequestStorefrontClient();
  const { data } = await storefrontClient.graphql(NEWS_QUERY);
  if (!data?.blog) {
    throw new Error("Blog not found: news");
  }
  return data.blog.articles.nodes;
}, "news");

export const route = {
  preload: () => fetchNews(),
} satisfies RouteDefinition;

export default function News() {
  const articles = createAsync(() => fetchNews());

  return (
    <main id="main-content" tabIndex={-1} class="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
      <Title>News — Mock.shop</Title>
      <header>
        <h1 class="text-6xl font-black tracking-tight md:text-8xl">News</h1>
      </header>

      <Show when={articles()}>
        {(items) => {
          const featured = () => items()[0];
          const rest = () => items().slice(1);

          return (
            <section class="mt-16 space-y-6">
              <Show when={featured()}>
                {(a) => (
                  <A
                    href={`/blogs/news/${a().handle}`}
                    class="group block border border-black/15 p-8 transition-colors hover:border-black md:p-10"
                  >
                    <h2 class="text-2xl font-bold tracking-tight md:text-3xl">{a().title}</h2>
                    <p class="mt-2 text-sm text-black/60">
                      {dateFormatter.format(new Date(a().publishedAt))}
                    </p>
                    <p class="mt-6 text-base leading-relaxed text-black/80">{a().excerpt}</p>
                    <p class="mt-8 text-sm font-medium text-black/70 group-hover:text-black">
                      Read more...
                    </p>
                  </A>
                )}
              </Show>

              <Show when={rest().length > 0}>
                <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <For each={rest()}>
                    {(article) => (
                      <A
                        href={`/blogs/news/${article.handle}`}
                        class="group block border border-black/15 p-8 transition-colors hover:border-black"
                      >
                        <h2 class="text-xl font-bold tracking-tight md:text-2xl">
                          {article.title}
                        </h2>
                        <p class="mt-2 text-sm text-black/60">
                          {dateFormatter.format(new Date(article.publishedAt))}
                        </p>
                        <p class="mt-6 text-base leading-relaxed text-black/80">
                          {article.excerpt}
                        </p>
                        <p class="mt-8 text-sm font-medium text-black/70 group-hover:text-black">
                          Read more...
                        </p>
                      </A>
                    )}
                  </For>
                </div>
              </Show>
            </section>
          );
        }}
      </Show>
    </main>
  );
}
