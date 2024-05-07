import { jsx, jsxs } from "react/jsx-runtime";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError
} from "@remix-run/react";
import favicon from "./assets/favicon.svg";
import { Layout } from "./components/Layout.jsx";
import { useNonce } from "@shopify/hydrogen";
import styles from "./assets/styles.css?url";
const links = () => {
  return [
    { rel: "stylesheet", href: styles },
    { rel: "icon", type: "image/svg+xml", href: favicon }
  ];
};
function App() {
  const nonce = useNonce();
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width,initial-scale=1" }),
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
      /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Outlet, {}) }),
      /* @__PURE__ */ jsx(ScrollRestoration, { nonce }),
      /* @__PURE__ */ jsx(Scripts, { nonce })
    ] })
  ] });
}
function ErrorBoundary() {
  const nonce = useNonce();
  const error = useRouteError();
  let errorMessage = "Unknown error";
  let errorStatus = 500;
  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width,initial-scale=1" }),
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
      /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsxs("div", { className: "route-error", children: [
        /* @__PURE__ */ jsx("h1", { children: "Please report this error" }),
        /* @__PURE__ */ jsx("h2", { children: errorStatus }),
        errorMessage && /* @__PURE__ */ jsx("fieldset", { children: /* @__PURE__ */ jsx("pre", { children: errorMessage }) })
      ] }) }),
      /* @__PURE__ */ jsx(ScrollRestoration, { nonce }),
      /* @__PURE__ */ jsx(Scripts, { nonce })
    ] })
  ] });
}
export {
  ErrorBoundary,
  App as default,
  links
};
