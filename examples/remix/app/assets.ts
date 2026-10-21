import { createAssetServer } from "remix/assets";
import { loadConfig } from "remix/cli";
import { componentHmr } from "remix/component-hmr/assets";

const isDevelopment = (process.env.NODE_ENV ?? "development") === "development";
const isHmr = Boolean(isDevelopment && process.env.REMIX_NODE_HMR);

// `remix.json` holds the JSON-compatible settings, so the Remix CLI (`remix assets`)
// sees the same mounts and browser boundary as the server.
const config = await loadConfig(process.cwd());
if (!config.assets) throw new Error("remix.json is missing its assets configuration.");

/**
 * Compiles and serves browser source on demand. `allowFiles` and `allowPackages` in
 * `remix.json` are the browser boundary: a browser module can't import anything outside
 * them, so server-only code (private tokens, GraphQL documents, session handling) can't
 * leak into the client. `app/routes.ts` is allowed for type-safe hrefs; it only imports
 * `remix/routes`. The `hydrogen` mount serves `@shopify/hydrogen`, which the monorepo
 * workspace links from outside `node_modules`.
 */
export const assets = createAssetServer({
  ...config.assets,
  sourceMaps: isDevelopment ? "external" : undefined,
  minify: !isDevelopment,
  watch: isDevelopment,
  // Production URLs are fingerprinted for immutable caching, which needs `watch: false`.
  fingerprint: !isDevelopment,
  hmr: isHmr
    ? {
        channel: async () => (await import("remix/node-hmr/runtime")).createBrowserHmrChannel(),
        moduleImporter: "remix/multiple-import-maps-polyfill",
      }
    : undefined,
  scripts: { loaders: isHmr ? [componentHmr()] : undefined },
});

export type DocumentAssets = {
  scriptEntry: Awaited<ReturnType<typeof assets.getScriptEntry>>;
  stylesheets: string[];
};

/** The script entry and stylesheet every document links, resolved once at startup. */
export async function getDocumentAssets(): Promise<DocumentAssets> {
  const [scriptEntry, stylesheet] = await Promise.all([
    assets.getScriptEntry("app/assets/public/entry.browser.ts"),
    assets.getHref("app/assets/public/app.css"),
  ]);
  return { scriptEntry, stylesheets: [stylesheet] };
}
