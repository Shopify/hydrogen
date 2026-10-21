import { gql } from "@shopify/hydrogen";
import { unsafeHTML } from "remix/component";
import { createController } from "remix/router";

import { redirectIfHandleIsLocalized } from "../../lib/redirect.ts";
import { contentCache, requireData } from "../../lib/storefront.ts";
import { routes } from "../../routes.ts";
import { Document } from "../../ui/document.tsx";
import { NotFoundPage } from "../../ui/error-pages.tsx";

const PAGE_QUERY = gql(`
  query Page($language: LanguageCode, $country: CountryCode, $handle: String!)
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      handle
      id
      title
      body
      seo {
        description
        title
      }
    }
  }
`);

export default createController(routes.pages, {
  actions: {
    async show({ params, render, request, shopify }) {
      const result = await shopify.storefront.graphql(PAGE_QUERY, {
        cache: contentCache(),
        variables: { handle: params.handle },
      });
      const page = requireData(result).page;
      if (!page) {
        return render(<NotFoundPage pathname={new URL(request.url).pathname} />, { status: 404 });
      }

      return (
        redirectIfHandleIsLocalized(request, { handle: params.handle, data: page }) ??
        render(
          <Document
            title={`Hydrogen | ${page.seo?.title ?? page.title}`}
            description={page.seo?.description}
          >
            <div class="page">
              <header>
                <h1>{page.title}</h1>
              </header>
              {/* Merchant-authored HTML from the Storefront API. */}
              <div innerHTML={unsafeHTML(page.body)} />
            </div>
          </Document>,
        )
      );
    },
  },
});
