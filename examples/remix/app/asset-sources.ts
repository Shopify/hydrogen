/**
 * Browser files every document links. `vite/remix-oxygen.ts` registers these with
 * Pitlane explicitly, because the document resolves them through computed paths.
 */
export const documentAssetSources = {
  scriptEntry: "app/assets/public/entry.browser.ts",
  stylesheet: "app/assets/public/app.css",
} as const;

/**
 * Sources the browser may load. The Vite build and dev server fail when a browser
 * module imports something outside this boundary, so server-only code (private
 * tokens, GraphQL documents, session handling) can't leak into the client graph.
 */
export const browserBoundary = {
  // `app/routes.ts` gives browser code type-safe hrefs. It only imports `remix/routes`.
  allowFiles: ["app/routes.ts", "app/**/public/**"],
  allowPackages: ["remix", "@shopify/hydrogen", "@pitlane/vite-plugin-remix"],
  denyFiles: ["app/**/*.test.*"],
};
