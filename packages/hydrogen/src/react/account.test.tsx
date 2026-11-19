// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { assert } from "../core/test-utils";
import { ShopifyAccount } from "./account";
import { LocaleProvider } from "./locale";

const FR_CA = { language: "FR", country: "CA", pathPrefix: "/fr-ca" } as const;

function getAccountElement(container: HTMLElement): Element {
  const element = container.querySelector("shopify-account");
  assert(element, "expected a shopify-account element");
  return element;
}

describe("ShopifyAccount", () => {
  it("points the component at the widget data and login routes", () => {
    const { container } = render(createElement(ShopifyAccount));

    const element = getAccountElement(container);
    expect(element.getAttribute("account-data-url")).toBe("/account/widget-data");
    expect(element.getAttribute("sign-in-url")).toBe("/account/login");
  });

  it("puts both routes under the locale's path prefix", () => {
    const { container } = render(
      createElement(LocaleProvider, { locale: FR_CA }, createElement(ShopifyAccount)),
    );

    const element = getAccountElement(container);
    expect(element.getAttribute("account-data-url")).toBe("/fr-ca/account/widget-data");
    expect(element.getAttribute("sign-in-url")).toBe("/fr-ca/account/login");
  });

  it("renders slot content", () => {
    const { container } = render(
      createElement(
        ShopifyAccount,
        null,
        createElement("div", { slot: "signed-out-avatar" }, "Sign in"),
      ),
    );

    const slotted = getAccountElement(container).querySelector('[slot="signed-out-avatar"]');
    expect(slotted?.textContent).toBe("Sign in");
  });
});
