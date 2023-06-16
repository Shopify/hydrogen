import type {
  ProductConnection,
  ArticleConnection,
  PageConnection,
} from '@shopify/hydrogen-react/storefront-api-types';
import {Await, Link} from '@remix-run/react';
import {Suspense} from 'react';
import {Pagination__unstable as Pagination} from '@shopify/hydrogen';

import {
  FeaturedCollections,
  Grid,
  ProductCard,
  ProductSwimlane,
  Section,
  Text,
} from '~/components';
import {getImageLoadingPriority} from '~/lib/const';
import type {FeaturedItemsQuery} from 'storefrontapi.generated';
import type {Article, Page} from 'temp.search-types';
import type {FetchSearchResultsReturn} from '~/routes/($locale).search';

export function SearchResults({
  results,
}: Pick<FetchSearchResultsReturn['searchResults'], 'results'>) {
  return (
    <div className="mt-8">
      {results &&
        Object.keys(results).map((type) => {
          const resourceResults = results[type as keyof typeof results];
          switch (type) {
            case 'pages':
              return resourceResults.edges.length ? (
                <SearchResultPageGrid
                  key="pages"
                  pages={resourceResults as PageConnection}
                />
              ) : null;
            case 'products':
              return resourceResults.edges.length ? (
                <SearchResultsProductsGrid
                  key="products"
                  products={resourceResults as ProductConnection}
                />
              ) : null;
            case 'articles':
              return resourceResults.edges.length ? (
                <SearchResultArticleGrid
                  key="articles"
                  articles={resourceResults as ArticleConnection}
                />
              ) : null;
            default:
              return null;
          }
        })}
    </div>
  );
}

function SearchResultsProductsGrid({products}: {products: ProductConnection}) {
  return (
    <>
      <h2 className="text-2xl font-bold mb-4">Products</h2>
      <Pagination connection={products}>
        {({nodes, isLoading, NextLink, PreviousLink}) => {
          const itemsMarkup = nodes.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              loading={getImageLoadingPriority(i)}
            />
          ));
          return (
            <div className="mb-8 md:mb-12">
              <div className="flex items-center justify-center mt-6">
                <PreviousLink className="inline-block rounded font-medium text-center py-3 px-6 border border-primary/10 bg-contrast text-primary w-full">
                  {isLoading ? 'Loading...' : 'Previous'}
                </PreviousLink>
              </div>
              <Grid>{itemsMarkup}</Grid>
              <div className="flex items-center justify-center mt-6">
                <NextLink className="inline-block rounded font-medium text-center py-3 px-6 border border-primary/10 bg-contrast text-primary w-full">
                  {isLoading ? 'Loading...' : 'Next'}
                </NextLink>
              </div>
            </div>
          );
        }}
      </Pagination>
    </>
  );
}

function SearchResultPageGrid({pages}: {pages: PageConnection}) {
  return (
    <section>
      <h2 className="text-2xl font-bold mb-4">Pages</h2>
      <div className="flex flex-col gap-y-4">
        {pages?.edges?.map(({node: page}: {node: Page}) => (
          <div key={page.id}>
            <h6>{page.title}</h6>
          </div>
        ))}
      </div>
    </section>
  );
}

function SearchResultArticleGrid({articles}: {articles: ArticleConnection}) {
  return (
    <section>
      <h2 className="text-2xl font-bold mb-4">Articles</h2>
      <div className="flex flex-col gap-y-4">
        {articles?.edges?.map(({node: article}: {node: Article}) => (
          <Link key={article.id} to={`/journal/${article.handle}`}>
            <h6>{article.title}</h6>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function NoSearchResults({
  recommendations,
}: {
  recommendations: FeaturedItemsQuery | null;
}) {
  return (
    <>
      <Section padding="x">
        <Text className="opacity-50">No results, try a different search.</Text>
      </Section>
      <Suspense>
        <Await
          errorElement="There was a problem loading related products"
          resolve={recommendations}
        >
          {(result) => {
            if (!result) return null;
            const {featuredCollections, featuredProducts} = result;
            return (
              <>
                <Section title="Trending Collections">
                  <FeaturedCollections collections={featuredCollections} />
                </Section>
                <Section title="Trending Products" padding="y">
                  <ProductSwimlane products={featuredProducts} />
                </Section>
              </>
            );
          }}
        </Await>
      </Suspense>
    </>
  );
}
