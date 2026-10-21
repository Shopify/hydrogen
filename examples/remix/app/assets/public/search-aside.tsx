import {
  createPredictiveSearchFormRegister,
  createPredictiveSearchStore,
  getPredictiveSearchFormAttributes,
  getPredictiveSearchItemUrl,
  getSearchResultUrl,
  type PredictiveSearchState,
  type PredictiveSearchStore,
} from "@shopify/hydrogen";
import { css, clientEntry, on, ref, type Handle } from "remix/component";

import { localizePath } from "../../lib/public/i18n.ts";
import { formatMoney } from "../../lib/public/money.ts";
import { routeTemplates } from "../../lib/public/route-templates.ts";
import { routes } from "../../routes.ts";
import { AsideDialog, asideId, closeAsides } from "../../ui/public/aside.tsx";
import { Image } from "../../ui/public/image.tsx";

const predictiveSearchStyle = css({
  height: "calc(100vh - var(--header-height) - 40px)",
  overflowY: "auto",
});

const formStyle = css({ background: "var(--color-light)", position: "sticky", top: "0" });

const resultStyle = css({ marginBottom: "2rem", "& h5": { textTransform: "uppercase" } });

const resultItemStyle = css({
  marginBottom: "0.5rem",
  "& a": { alignItems: "center", display: "flex" },
  "& a img": { height: "100%", marginRight: "0.75rem" },
});

const PREDICTIVE_SEARCH_LIMIT = 5;
const register = createPredictiveSearchFormRegister();

/**
 * Predictive search in the search aside. The form is a native `GET /search` form, so
 * submitting it always reaches the full search page; typing adds predictive results
 * from Hydrogen's `/api/predictive-search` handler.
 */
export const SearchAside = clientEntry(
  import.meta.url,
  function SearchAside(handle: Handle<{ pathPrefix: string }>) {
    let store: PredictiveSearchStore | undefined;
    let state: PredictiveSearchState | undefined;
    let input: HTMLInputElement | undefined;

    handle.queueTask((signal) => {
      if (signal.aborted) return;
      store = createPredictiveSearchStore({
        limit: PREDICTIVE_SEARCH_LIMIT,
        predictiveSearchEndpoint: localizePath("/api/predictive-search", handle.props.pathPrefix),
      });
      state = store.getState();
      const unsubscribe = store.subscribe((next) => {
        state = next;
        handle.update();
      });
      // The task's own signal aborts on the next render; the store lives as long as
      // the component.
      handle.signal.addEventListener(
        "abort",
        () => {
          unsubscribe();
          store?.destroy();
        },
        { once: true },
      );

      // Focus the search input whenever the aside opens.
      const dialog = document.getElementById(asideId("search"));
      dialog?.addEventListener(
        "toggle",
        () => {
          if (dialog instanceof HTMLDialogElement && dialog.open) input?.focus();
        },
        { signal: handle.signal },
      );
      handle.update();
    });

    return () => {
      const { pathPrefix } = handle.props;
      const searchPath = localizePath(routes.search.href(), pathPrefix);
      const term = state?.term ?? "";
      const items = state?.result.items;
      const localize = (url: string) => localizePath(url, pathPrefix);

      return (
        <AsideDialog type="search" heading="SEARCH">
          <div mix={predictiveSearchStyle}>
            <br />
            <form {...getPredictiveSearchFormAttributes(searchPath)} mix={formStyle}>
              <input
                {...register("query")}
                placeholder="Search"
                aria-label="Search"
                mix={[
                  ref((node) => (input = node)),
                  on("input", (event) => {
                    void store?.search(event.currentTarget.value);
                  }),
                ]}
              />
              &nbsp;
              <button type="submit" mix={on("click", closeAsides)}>
                Search
              </button>
            </form>

            {state?.status === "loading" && term && !state.result.total ? (
              <div>Loading...</div>
            ) : null}
            {state?.error ? (
              <p role="alert" style={{ color: "red" }}>
                {state.error}
              </p>
            ) : null}
            {term && state?.status === "success" && !state.result.total ? (
              <p>
                No results found for <q>{term}</q>
              </p>
            ) : null}

            {items && state?.result.total ? (
              <>
                {items.queries.length ? (
                  <div mix={resultStyle}>
                    <h5>Suggestions</h5>
                    <ul>
                      {items.queries.map((query) => (
                        <li mix={resultItemStyle} key={query.text}>
                          <a
                            href={localize(
                              getPredictiveSearchItemUrl(query, { routes: routeTemplates }),
                            )}
                            mix={on("click", closeAsides)}
                          >
                            {query.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {items.products.length ? (
                  <div mix={resultStyle}>
                    <h5>Products</h5>
                    <ul>
                      {items.products.map((product) => {
                        const variant = product.selectedOrFirstAvailableVariant;
                        return (
                          <li mix={resultItemStyle} key={product.id}>
                            <a
                              href={localize(
                                getPredictiveSearchItemUrl(product, {
                                  routes: routeTemplates,
                                  term,
                                }),
                              )}
                              mix={on("click", closeAsides)}
                            >
                              {variant?.image ? (
                                <Image
                                  data={variant.image}
                                  alt={product.title}
                                  width={50}
                                  height={50}
                                />
                              ) : null}
                              <div>
                                <p>{product.title}</p>
                                {variant?.price ? (
                                  <small>{formatMoney(variant.price)}</small>
                                ) : null}
                              </div>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
                {items.collections.length ? (
                  <div mix={resultStyle}>
                    <h5>Collections</h5>
                    <ul>
                      {items.collections.map((collection) => (
                        <li mix={resultItemStyle} key={collection.id}>
                          <a
                            href={localize(
                              getPredictiveSearchItemUrl(collection, {
                                routes: routeTemplates,
                                term,
                              }),
                            )}
                            mix={on("click", closeAsides)}
                          >
                            {collection.image ? (
                              <Image
                                data={collection.image}
                                alt={collection.title}
                                width={50}
                                height={50}
                              />
                            ) : null}
                            <span>{collection.title}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {items.pages.length ? (
                  <div mix={resultStyle}>
                    <h5>Pages</h5>
                    <ul>
                      {items.pages.map((page) => (
                        <li mix={resultItemStyle} key={page.id}>
                          <a
                            href={localize(
                              getPredictiveSearchItemUrl(page, { routes: routeTemplates, term }),
                            )}
                            mix={on("click", closeAsides)}
                          >
                            {page.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {items.articles.length ? (
                  <div mix={resultStyle}>
                    <h5>Articles</h5>
                    <ul>
                      {items.articles.map((article) => (
                        <li mix={resultItemStyle} key={article.id}>
                          <a
                            href={localize(
                              getPredictiveSearchItemUrl(article, { routes: routeTemplates, term }),
                            )}
                            mix={on("click", closeAsides)}
                          >
                            {article.image ? (
                              <Image
                                data={article.image}
                                alt={article.title}
                                width={50}
                                height={50}
                              />
                            ) : null}
                            <span>{article.title}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <a
                  href={getSearchResultUrl({ baseUrl: searchPath, term })}
                  mix={on("click", closeAsides)}
                >
                  <p>
                    View all results for <q>{term}</q>
                    &nbsp; →
                  </p>
                </a>
              </>
            ) : null}
          </div>
        </AsideDialog>
      );
    };
  },
);
