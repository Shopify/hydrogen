// Hydrogen ships unbundled, so file sizes in dist/ say little about what a
// storefront pays. Each scenario is what a consumer's bundler would emit for
// a given import, after tree-shaking and minification.
//
// "entry" scenarios import a whole subpath export. The rest mirror the most
// common imports across templates/ and examples/. Replace them with real
// Oxygen usage once that analysis exists.

export type BundleTarget = "server" | "client";

export interface BundleScenario {
  name: string;
  target: BundleTarget;
  code: string;
}

const entry = (subpath: string, target: BundleTarget): BundleScenario => ({
  name: `entry: @shopify/hydrogen${subpath}`,
  target,
  code: `export * from "@shopify/hydrogen${subpath}";`,
});

const named = (
  name: string,
  target: BundleTarget,
  imports: Record<string, string[]>,
): BundleScenario => ({
  name,
  target,
  code: Object.entries(imports)
    .map(([specifier, names]) => `export { ${names.join(", ")} } from "${specifier}";`)
    .join("\n"),
});

export const scenarios: BundleScenario[] = [
  entry("", "server"),
  entry("/customer-account", "server"),
  entry("/react", "client"),
  entry("/vue", "client"),

  named("request handling", "server", {
    "@shopify/hydrogen": [
      "createStorefrontClient",
      "createShopifyRequestContext",
      "handleShopifyRoutes",
      "handleShopifyRedirects",
      "defineShopifyRouteTemplates",
      "createContentSecurityPolicy",
      "gql",
    ],
  }),
  named("cart handlers", "server", {
    "@shopify/hydrogen": ["createCartServerHandlers"],
  }),
  named("predictive search handlers", "server", {
    "@shopify/hydrogen": ["createPredictiveSearchServerHandlers"],
  }),
  named("customer account", "server", {
    "@shopify/hydrogen/customer-account": [
      "createCustomerAccountClient",
      "createCustomerSession",
      "createCustomerAccountServerHandlers",
    ],
  }),

  named("react cart", "client", {
    "@shopify/hydrogen/react": ["createCartComponents", "useCartAnalytics"],
    "@shopify/hydrogen": ["formatMoney"],
  }),
  named("react product", "client", {
    "@shopify/hydrogen/react": ["createProductComponents"],
    "@shopify/hydrogen": [
      "canAddToCart",
      "buildProductSelectionSearchParams",
      "getSelectedProductOptions",
    ],
  }),
  named("react collection", "client", {
    "@shopify/hydrogen/react": ["CollectionProvider", "useCollection", "useCollectionForm"],
    "@shopify/hydrogen": [
      "parseCollectionParams",
      "serializeCollectionParams",
      "getFilterRemovalUrl",
      "getSortByValue",
      "isFilterInputActive",
    ],
  }),
  named("react predictive search", "client", {
    "@shopify/hydrogen/react": [
      "PredictiveSearchProvider",
      "usePredictiveSearch",
      "usePredictiveSearchActions",
      "usePredictiveSearchForm",
    ],
    "@shopify/hydrogen": ["getPredictiveSearchItemUrl"],
  }),
  named("react shopify scripts", "client", {
    "@shopify/hydrogen/react": ["ShopifyScripts"],
  }),
  named("react shop pay button", "client", {
    "@shopify/hydrogen/react": ["ShopPayButton"],
  }),
  named("vanilla cart", "client", {
    "@shopify/hydrogen": ["createCartStore", "createCartFormRegister", "configureCartEndpoint"],
  }),
];
