import {json, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type MetaFunction, Link, Form} from '@remix-run/react';
import {
  Analytics,
  Pagination,
  type SearchHandlerReturn,
  type SearchQueryFragment,
  Image,
  Money,
} from '@shopify/hydrogen';
import type {ProductConnection} from '@shopify/hydrogen/storefront-api-types';

export const meta: MetaFunction = () => {
  return [{title: `Hydrogen | Search`}];
};

export const action = loader;

export async function loader({context}: LoaderFunctionArgs) {
  const data = await context.search();
  // TODO: How to best deal with the fact that this client can return either a
  // predictive search or a regular search (typescript wise)
  return json(data);
}

export default function SearchPage() {
  const data = useLoaderData<typeof loader>();
  const {search, predictiveSearch} = data;
  // TODO: This is not ideal, but it's a side effect of a unified client
  if (predictiveSearch || !search) {
    return null;
  }
  return (
    <div className="search">
      <h1>Search</h1>
      <SearchForm term={search.term} />
      {!search.result.total ? (
        <NoSearchResults />
      ) : (
        <SearchResults {...search} />
      )}
      <Analytics.SearchView
        data={{searchTerm: search.term, searchResults: search.result.resources}}
      />
    </div>
  );
}

function SearchForm({term}: {term: string}) {
  return (
    <Form method="get" action="/search">
      <input defaultValue={term} name="q" placeholder="Search…" type="search" />
      &nbsp;
      <button type="submit">Search</button>
    </Form>
  );
}

export function SearchResults({result}: SearchHandlerReturn) {
  if (!result.total || !result.resources) {
    return null;
  }
  const {resources} = result;
  const keys = Object.keys(resources) as Array<keyof typeof resources>;
  return (
    <div>
      {resources &&
        keys.map((type) => {
          const resource = resources[type];
          const resourceType = resource.nodes[0]?.__typename;

          switch (resourceType) {
            case 'Page': {
              const pages = resource as SearchQueryFragment['pages'];
              return pages.nodes.length ? (
                <SearchResultPageGrid key="pages" pages={pages} />
              ) : null;
            }

            case 'Product': {
              const products = resource as SearchQueryFragment['products'];
              return products.nodes.length ? (
                <SearchResultsProductsGrid key="products" products={products} />
              ) : null;
            }

            case 'Article': {
              const articles = resource as SearchQueryFragment['articles'];
              return articles.nodes.length ? (
                <SearchResultArticleGrid key="articles" articles={articles} />
              ) : null;
            }

            default:
              return null;
          }
        })}
    </div>
  );
}

function SearchResultsProductsGrid({
  products,
}: {
  products: SearchQueryFragment['products'];
}) {
  return (
    <div className="search-result">
      <h2>Products</h2>
      {/* // FIX: casting is necessary because of the NormalizeResults type */}
      <Pagination connection={products as ProductConnection}>
        {({nodes, isLoading, NextLink, PreviousLink}) => {
          const ItemsMarkup = nodes.map((product) => {
            return (
              <div className="search-results-item" key={product.id}>
                {/* FIX: Our normalized results include a url prop which is not part of this type */}
                <Link prefetch="intent" to={product.url}>
                  {product.variants.nodes[0].image && (
                    <Image
                      data={product.variants.nodes[0].image}
                      alt={product.title}
                      width={50}
                    />
                  )}
                  <div>
                    <p>{product.title}</p>
                    <small>
                      <Money data={product.variants.nodes[0].price} />
                    </small>
                  </div>
                </Link>
              </div>
            );
          });
          return (
            <div>
              <div>
                <PreviousLink>
                  {isLoading ? 'Loading...' : <span>↑ Load previous</span>}
                </PreviousLink>
              </div>
              <div>
                {ItemsMarkup}
                <br />
              </div>
              <div>
                <NextLink>
                  {isLoading ? 'Loading...' : <span>Load more ↓</span>}
                </NextLink>
              </div>
            </div>
          );
        }}
      </Pagination>
      <br />
    </div>
  );
}

function SearchResultPageGrid({pages}: {pages: SearchQueryFragment['pages']}) {
  return (
    <div className="search-result">
      <h2>Pages</h2>
      <div>
        {pages?.nodes?.map((page) => (
          <div className="search-results-item" key={page.id}>
            <Link prefetch="intent" to={page.url}>
              {page.title}
            </Link>
          </div>
        ))}
      </div>
      <br />
    </div>
  );
}

function SearchResultArticleGrid({
  articles,
}: {
  articles: SearchQueryFragment['articles'];
}) {
  return (
    <div className="search-result">
      <h2>Articles</h2>
      <div>
        {articles?.nodes?.map((article) => (
          <div className="search-results-item" key={article.id}>
            <Link prefetch="intent" to={article.url}>
              {article.title}
            </Link>
          </div>
        ))}
      </div>
      <br />
    </div>
  );
}

export function NoSearchResults() {
  return <p>No results, try a different search.</p>;
}
