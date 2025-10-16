import { jsx, jsxs } from "react/jsx-runtime";
import { useNonce } from "@shopify/hydrogen";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { Layout as VirtualLayout } from "./components/Layout.jsx";
import styles from "./assets/styles.css?url";
function Layout() {
  const nonce = useNonce();
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width,initial-scale=1" }),
      /* @__PURE__ */ jsx("link", { rel: "stylesheet", href: styles }),
      /* @__PURE__ */ jsx("title", { children: "Hydrogen" }),
      /* @__PURE__ */ jsx(
        "meta",
        {
          name: "description",
          content: "A custom storefront powered by Hydrogen"
        }
      ),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(VirtualLayout, { children: /* @__PURE__ */ jsx(Outlet, {}) }),
      /* @__PURE__ */ jsx(ScrollRestoration, { nonce }),
      /* @__PURE__ */ jsx(Scripts, { nonce })
    ] })
  ] });
}
export {
  Layout as default
};
