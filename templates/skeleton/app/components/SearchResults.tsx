import {Link} from '@remix-run/react';
import {Image, Money, Pagination} from '@shopify/hydrogen';
import type {SerializeFrom} from '@shopify/remix-oxygen';
import {urlWithTrackingParams} from '~/lib/search';
import {loader as searchLoader} from '~/routes/search';

type SearchLoader = SerializeFrom<typeof searchLoader>;
type SearchResult = NonNullable<SearchLoader['result']>;
type SearchItems = SearchResult['items'];

type SearchResultsProps = SearchLoader & {
  children: (args: SearchItems & {term: string}) => React.ReactNode;
};

export function SearchResults({result, term, children}: SearchResultsProps) {
  if (!result?.total) {
    return null;
  }
  return children({...result.items, term});
}

SearchResults.Articles = function ({
  articles,
  term,
}: {
  articles: SearchItems['articles'];
  term: string;
}) {
  if (!articles?.nodes.length) {
    return null;
  }
  return (
    <div className="search-result">
      <h2>Articles</h2>
      <div>
        {articles?.nodes?.map((article) => {
          const articleUrl = urlWithTrackingParams({
            baseUrl: `/blogs/${article.handle}`,
            trackingParams: article.trackingParameters,
            term,
          });
          return (
            <div className="search-results-item" key={article.id}>
              <Link prefetch="intent" to={articleUrl}>
                {article.title}
              </Link>
            </div>
          );
        })}
      </div>
      <br />
    </div>
  );
};

SearchResults.Pages = function ({
  pages,
  term,
}: {
  pages: SearchItems['pages'];
  term: string;
}) {
  if (!pages?.nodes.length) {
    return null;
  }
  return (
    <div className="search-result">
      <h2>Pages</h2>
      <div>
        {pages?.nodes?.map((page) => {
          const pageUrl = urlWithTrackingParams({
            baseUrl: `/pages/${page.handle}`,
            trackingParams: page.trackingParameters,
            term,
          });
          return (
            <div className="search-results-item" key={page.id}>
              <Link prefetch="intent" to={pageUrl}>
                {page.title}
              </Link>
            </div>
          );
        })}
      </div>
      <br />
    </div>
  );
};

SearchResults.Products = function ({
  products,
  term,
}: Pick<SearchItems, 'products'> & {term: string}) {
  if (!products?.nodes.length) {
    return null;
  }
  return (
    <div className="search-result">
      <h2>Products</h2>
      <Pagination connection={products}>
        {({nodes, isLoading, NextLink, PreviousLink}) => {
          const ItemsMarkup = nodes.map((product) => {
            const productUrl = urlWithTrackingParams({
              baseUrl: `/products/${product.handle}`,
              trackingParams: product.trackingParameters,
              term,
            });
            return (
              <div className="search-results-item" key={product.id}>
                <Link prefetch="intent" to={productUrl}>
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
};

SearchResults.Empty = function () {
  return <p>No results, try a different search.</p>;
};
