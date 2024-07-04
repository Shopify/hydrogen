import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useLoaderData } from "@remix-run/react";
import { HydrogenLogoBaseBW } from "../components/HydrogenLogoBaseBW.jsx";
import { HydrogenLogoBaseColor } from "../components/HydrogenLogoBaseColor.jsx";
import { IconGithub } from "../components/IconGithub.jsx";
import { IconTwitter } from "../components/IconTwitter.jsx";
import { IconBanner } from "../components/IconBanner.jsx";
import { IconError } from "../components/IconError.jsx";
import favicon from "../assets/favicon.svg";
import interVariableFontWoff2 from "../assets/inter-variable-font.woff2";
import jetbrainsmonoVariableFontWoff2 from "../assets/jetbrainsmono-variable-font.woff2";
const links = () => [
  {
    rel: "icon",
    type: "image/svg+xml",
    href: favicon
  },
  {
    rel: "preload",
    href: interVariableFontWoff2,
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous"
  },
  {
    rel: "preload",
    href: jetbrainsmonoVariableFontWoff2,
    as: "font",
    type: "font/ttf",
    crossOrigin: "anonymous"
  }
];
async function loader({
  context: { storefront }
}) {
  const layout = await storefront.query(LAYOUT_QUERY);
  return { layout, isMockShop: storefront.getApiUrl().includes("mock.shop") };
}
const HYDROGEN_SHOP_ID = "gid://shopify/Shop/55145660472";
function ErrorBoundary() {
  return /* @__PURE__ */ jsx(ErrorPage, {});
}
function Index() {
  const {
    isMockShop,
    layout: { shop }
  } = useLoaderData();
  let { name: shopName, id: shopId } = shop;
  const configDone = shopId !== HYDROGEN_SHOP_ID && !isMockShop;
  if (isMockShop || !shopName) shopName = "Hydrogen";
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs(Layout, { shopName, children: [
    configDone ? /* @__PURE__ */ jsx(HydrogenLogoBaseColor, {}) : /* @__PURE__ */ jsx(HydrogenLogoBaseBW, {}),
    /* @__PURE__ */ jsxs("h1", { children: [
      "Hello, ",
      shopName
    ] }),
    /* @__PURE__ */ jsx("p", { children: "Welcome to your new custom storefront" }),
    /* @__PURE__ */ jsxs("section", { className: "Banner", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(IconBanner, {}),
        /* @__PURE__ */ jsx("h2", { children: configDone ? "Create your first route" : "Configure storefront token" })
      ] }),
      configDone ? /* @__PURE__ */ jsxs("p", { children: [
        "You\u2019re seeing this because you don\u2019t have a home route in your project yet. ",
        /* @__PURE__ */ jsx("br", {}),
        "Run ",
        /* @__PURE__ */ jsx("code", { children: "npx shopify hydrogen setup" }),
        " to scaffold standard Shopify routes. Learn more about",
        ` `,
        /* @__PURE__ */ jsx(CreateRoutesLink, {})
      ] }) : /* @__PURE__ */ jsxs("p", { children: [
        "You\u2019re seeing this because you have not yet configured your storefront token. ",
        /* @__PURE__ */ jsx("br", {}),
        /* @__PURE__ */ jsx("br", {}),
        " To link your store,",
        ` `,
        "run",
        " ",
        /* @__PURE__ */ jsx("code", { children: "npx shopify hydrogen link && npx shopify hydrogen env pull" }),
        ". Then, run ",
        /* @__PURE__ */ jsx("code", { children: "npx shopify hydrogen setup" }),
        " to scaffold standard Shopify routes.",
        /* @__PURE__ */ jsx("br", {}),
        "Learn more about",
        ` `,
        /* @__PURE__ */ jsx(
          "a",
          {
            target: "_blank",
            rel: "norefferer noopener",
            href: "https://shopify.dev/docs/custom-storefronts/hydrogen/environment-variables",
            children: "editing environment variables"
          }
        ),
        ` `,
        "and",
        ` `,
        /* @__PURE__ */ jsx(CreateRoutesLink, {}),
        "."
      ] })
    ] }),
    /* @__PURE__ */ jsx(ResourcesLinks, {})
  ] }) });
}
function CreateRoutesLink() {
  return /* @__PURE__ */ jsx(
    "a",
    {
      target: "_blank",
      rel: "norefferer noopener",
      href: "https://shopify.dev/docs/custom-storefronts/hydrogen/building/begin-development#step-4-create-a-route",
      children: "creating routes"
    }
  );
}
function ErrorPage() {
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs(Layout, { shopName: "Hydrogen", children: [
    /* @__PURE__ */ jsx(HydrogenLogoBaseBW, {}),
    /* @__PURE__ */ jsx("h1", { children: "Hello, Hydrogen" }),
    /* @__PURE__ */ jsx("p", { children: "Welcome to your new custom storefront" }),
    /* @__PURE__ */ jsxs("section", { className: "Banner ErrorBanner", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(IconError, {}),
        /* @__PURE__ */ jsx("h2", { children: "There\u2019s a problem with your storefront" })
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Check your domain and API token in your ",
        /* @__PURE__ */ jsx("code", { children: ".env" }),
        " file. Learn more about",
        ` `,
        /* @__PURE__ */ jsx(
          "a",
          {
            target: "_blank",
            rel: "norefferer noopener",
            href: "https://shopify.dev/docs/custom-storefronts/hydrogen/environment-variables",
            children: "editing environment variables"
          }
        ),
        "."
      ] })
    ] }),
    /* @__PURE__ */ jsx(ResourcesLinks, {})
  ] }) });
}
function ResourcesLinks() {
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("section", { className: "Links", children: [
    /* @__PURE__ */ jsx("h2", { children: "Start building" }),
    /* @__PURE__ */ jsxs("ul", { children: [
      /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
        "a",
        {
          target: "_blank",
          rel: "norefferer noopener",
          href: "https://shopify.dev/custom-storefronts/hydrogen/building/collection-page",
          children: "Collection template"
        }
      ) }),
      /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
        "a",
        {
          target: "_blank",
          rel: "norefferer noopener",
          href: "https://shopify.dev/custom-storefronts/hydrogen/building/product-details-page",
          children: "Product template"
        }
      ) }),
      /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
        "a",
        {
          target: "_blank",
          rel: "norefferer noopener",
          href: "https://shopify.dev/custom-storefronts/hydrogen/building/cart",
          children: "Cart"
        }
      ) })
    ] }),
    /* @__PURE__ */ jsx("h2", { children: "Resources" }),
    /* @__PURE__ */ jsxs("ul", { children: [
      /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
        "a",
        {
          target: "_blank",
          rel: "norefferer noopener",
          href: "https://shopify.dev/custom-storefronts/hydrogen",
          children: "Hydrogen docs"
        }
      ) }),
      /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
        "a",
        {
          target: "_blank",
          rel: "norefferer noopener",
          href: "https://shopify.dev/custom-storefronts/hydrogen/project-structure",
          children: "Remix and project structure"
        }
      ) }),
      /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
        "a",
        {
          target: "_blank",
          rel: "norefferer noopener",
          href: "https://shopify.dev/custom-storefronts/hydrogen/data-fetching/fetch-data",
          children: "Data queries and fetching"
        }
      ) })
    ] })
  ] }) });
}
function Layout({
  shopName,
  children
}) {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("header", { children: [
      /* @__PURE__ */ jsx("h1", { children: shopName?.toUpperCase() }),
      /* @__PURE__ */ jsx("p", { children: "\xA0Dev Mode\xA0" }),
      /* @__PURE__ */ jsxs("nav", { children: [
        /* @__PURE__ */ jsx(
          "a",
          {
            target: "_blank",
            rel: "norefferer noopener",
            href: "https://github.com/Shopify/hydrogen",
            children: /* @__PURE__ */ jsx(IconGithub, {})
          }
        ),
        /* @__PURE__ */ jsx(
          "a",
          {
            target: "_blank",
            rel: "norefferer noopener",
            href: "https://twitter.com/shopifydevs?lang=en",
            children: /* @__PURE__ */ jsx(IconTwitter, {})
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("main", { children }),
    /* @__PURE__ */ jsx("footer", { children: /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
      "a",
      {
        href: "https://shopify.com",
        target: "_blank",
        rel: "noreferrer noopener",
        children: "Powered by Shopify"
      }
    ) }) })
  ] });
}
const LAYOUT_QUERY = `#graphql
  query layout {
    shop {
      name
      id
    }
  }
`;
export {
  ErrorBoundary,
  HYDROGEN_SHOP_ID,
  Index as default,
  links,
  loader
};
