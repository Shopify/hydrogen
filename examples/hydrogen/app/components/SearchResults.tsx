import { Link } from "react-router";

import { Image } from "~/components/Image";
import { PaginatedResourceSection } from "~/components/PaginatedResourceSection";
import { formatMoney } from "~/lib/money";
import { urlWithTrackingParams, type RegularSearchReturn } from "~/lib/search";

type SearchItems = RegularSearchReturn["result"]["items"];
type PartialSearchResult<ItemType extends keyof SearchItems> = Pick<SearchItems, ItemType> &
  Pick<RegularSearchReturn, "term">;

type SearchResultsProps = RegularSearchReturn & {
  children: (args: SearchItems & { term: string }) => React.ReactNode;
};

export function SearchResults({
  term,
  result,
  children,
}: Omit<SearchResultsProps, "error" | "type">) {
  if (!result?.total) {
    return null;
  }

  return children({ ...result.items, term });
}

SearchResults.Articles = SearchResultsArticles;
SearchResults.Pages = SearchResultsPages;
SearchResults.Products = SearchResultsProducts;
SearchResults.Empty = SearchResultsEmpty;

function SearchResultsArticles({ term, articles }: PartialSearchResult<"articles">) {
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
}

function SearchResultsPages({ term, pages }: PartialSearchResult<"pages">) {
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
}

function SearchResultsProducts({ term, products }: PartialSearchResult<"products">) {
  if (!products?.nodes.length) {
    return null;
  }

  return (
    <div className="search-result">
      <h2>Products</h2>
      <PaginatedResourceSection connection={products}>
        {({ node: product }) => (
          <SearchResultProduct key={product.id} product={product} term={term} />
        )}
      </PaginatedResourceSection>
      <br />
    </div>
  );
}

function SearchResultProduct({
  product,
  term,
}: {
  product: PartialSearchResult<"products">["products"]["nodes"][number];
  term: string;
}) {
  const productUrl = urlWithTrackingParams({
    baseUrl: `/products/${product.handle}`,
    trackingParams: product.trackingParameters,
    term,
  });
  const price = product.selectedOrFirstAvailableVariant?.price;
  const image = product.selectedOrFirstAvailableVariant?.image;

  return (
    <div className="search-results-item">
      <Link prefetch="intent" to={productUrl}>
        {image && <Image data={image} alt={product.title} width={50} />}
        <div>
          <p>{product.title}</p>
          <small>{price ? formatMoney(price) : null}</small>
        </div>
      </Link>
    </div>
  );
}

function SearchResultsEmpty() {
  return <p>No results, try a different search.</p>;
}
