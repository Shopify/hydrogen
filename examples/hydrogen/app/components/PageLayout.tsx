import { PredictiveSearchProvider } from "@shopify/hydrogen/react";
import { Await, Link } from "react-router";

import { Aside } from "~/components/Aside";
import { CartMain } from "~/components/CartMain";
import { Footer } from "~/components/Footer";
import { Header, HeaderMenu } from "~/components/Header";
import { getSearchPageUrl, SearchFormPredictive } from "~/components/SearchFormPredictive";
import { SearchResultsPredictive } from "~/components/SearchResultsPredictive";
import type { FooterQuery, HeaderQuery } from "~/lib/fragments";

const PREDICTIVE_SEARCH_LIMIT = 5;

interface PageLayoutProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  i18n: { pathPrefix: string };
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  children?: React.ReactNode;
}

export function PageLayout({
  children = null,
  footer,
  header,
  i18n,
  isLoggedIn,
  publicStoreDomain,
}: PageLayoutProps) {
  return (
    <Aside.Provider>
      <CartAside />
      <SearchAside />
      <MobileMenuAside header={header} publicStoreDomain={publicStoreDomain} />
      {header && (
        <Header
          header={header}
          isLoggedIn={isLoggedIn}
          pathPrefix={i18n.pathPrefix}
          publicStoreDomain={publicStoreDomain}
        />
      )}
      <main>{children}</main>
      <Footer footer={footer} header={header} publicStoreDomain={publicStoreDomain} />
    </Aside.Provider>
  );
}

function CartAside() {
  return (
    <Aside type="cart" heading="CART">
      <CartMain layout="aside" />
    </Aside>
  );
}

function SearchAside() {
  return (
    <Aside type="search" heading="SEARCH">
      <PredictiveSearchProvider limit={PREDICTIVE_SEARCH_LIMIT}>
        <div className="predictive-search">
          <br />
          <SearchFormPredictive>
            {({ fetchResults, goToSearch, inputRef, register }) => (
              <>
                <input
                  {...register("query", {
                    placeholder: "Search",
                  })}
                  onFocus={fetchResults}
                  ref={inputRef}
                />
                &nbsp;
                <button type="button" onClick={() => goToSearch()}>
                  Search
                </button>
              </>
            )}
          </SearchFormPredictive>

          <SearchResultsPredictive>
            {({ error, items, total, term, state, closeSearch }) => {
              const { articles, collections, pages, products, queries } = items;

              if (state === "loading" && term.current) {
                return <div>Loading...</div>;
              }

              if (state === "error" && error) {
                return <p style={{ color: "red" }}>{error}</p>;
              }

              if (!total) {
                return <SearchResultsPredictive.Empty term={term} />;
              }

              return (
                <>
                  <SearchResultsPredictive.Queries queries={queries} closeSearch={closeSearch} />
                  <SearchResultsPredictive.Products
                    products={products}
                    closeSearch={closeSearch}
                    term={term}
                  />
                  <SearchResultsPredictive.Collections
                    collections={collections}
                    closeSearch={closeSearch}
                    term={term}
                  />
                  <SearchResultsPredictive.Pages
                    pages={pages}
                    closeSearch={closeSearch}
                    term={term}
                  />
                  <SearchResultsPredictive.Articles
                    articles={articles}
                    closeSearch={closeSearch}
                    term={term}
                  />
                  {term.current && total ? (
                    <Link onClick={closeSearch} to={getSearchPageUrl(term.current)}>
                      <p>
                        View all results for <q>{term.current}</q>
                        &nbsp; →
                      </p>
                    </Link>
                  ) : null}
                </>
              );
            }}
          </SearchResultsPredictive>
        </div>
      </PredictiveSearchProvider>
    </Aside>
  );
}

function MobileMenuAside({
  header,
  publicStoreDomain,
}: {
  header: PageLayoutProps["header"];
  publicStoreDomain: PageLayoutProps["publicStoreDomain"];
}) {
  return (
    header.menu &&
    header.shop.primaryDomain?.url && (
      <Aside type="mobile" heading="MENU">
        <HeaderMenu
          menu={header.menu}
          viewport="mobile"
          primaryDomainUrl={header.shop.primaryDomain.url}
          publicStoreDomain={publicStoreDomain}
        />
      </Aside>
    )
  );
}
