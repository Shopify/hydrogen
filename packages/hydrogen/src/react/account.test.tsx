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

  it("puts the signed-out avatar in the component's slot without affecting layout", () => {
    const { container } = render(
      createElement(ShopifyAccount, {
        signedOutAvatar: createElement("span", null, "Sign in"),
      }),
    );

    const slotted = getAccountElement(container).querySelector('[slot="signed-out-avatar"]');
    if (!(slotted instanceof HTMLElement)) throw new Error("expected a signed-out-avatar slot");
    expect(slotted.style.display).toBe("contents");
    expect(slotted.innerHTML).toBe("<span>Sign in</span>");
  });

  it.each([undefined, null, false, true, ""])(
    "keeps the component's default icon when the signed-out avatar is %j",
    (signedOutAvatar) => {
      const { container } = render(createElement(ShopifyAccount, { signedOutAvatar }));

      expect(getAccountElement(container).children).toHaveLength(0);
    },
  );
});
