// @vitest-environment happy-dom
import { act } from "@testing-library/react";
import { createElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ShopifyGlobal } from "../globals";
import { CollectionProvider, useCollection } from "./collection";

function PriceFilters() {
  const filters = useCollection((state) => JSON.stringify(state.filters));
  return createElement("span", null, filters);
}

function renderCollection(urlSearch: string) {
  return createElement(
    CollectionProvider,
    { data: { handle: "shoes", dataSearch: urlSearch }, urlSearch },
    createElement(PriceFilters),
  );
}

afterEach(() => {
  document.body.replaceChildren();
  delete window.Shopify;
  vi.restoreAllMocks();
});

describe("CollectionProvider hydration", () => {
  it.each(["filter.v.price.gte=12,50", "filter.v.price.gte=1.234,50"])(
    "reads %s the same on the server and under a de shop locale in the browser",
    async (urlSearch) => {
      const container = document.createElement("div");
      container.innerHTML = renderToString(renderCollection(urlSearch));
      document.body.append(container);
      const serverHtml = container.innerHTML;

      window.Shopify = { locale: "de" } as ShopifyGlobal;
      const onRecoverableError = vi.fn();
      vi.spyOn(console, "error").mockImplementation(() => {});
      let root: Root | undefined;

      await act(async () => {
        root = hydrateRoot(container, renderCollection(urlSearch), { onRecoverableError });
      });

      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.innerHTML).toBe(serverHtml);

      await act(async () => root?.unmount());
    },
  );
});
