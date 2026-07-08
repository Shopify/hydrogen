export type LocalCdnAsset = {
  cdnUrl: string;
  localUrl: string;
  localPath: URL;
  contentType: string;
  buildHint: string;
};

const SHOPIFY_CDN_ORIGIN = "https://cdn.shopify.com";
const WEBMCP_LOCAL_URL = "/storefront/webmcp.js";
const WEBMCP_SOURCEMAP_LOCAL_URL = `${WEBMCP_LOCAL_URL}.map`;
const ANALYTICS_LOCAL_URL = "/storefront/analytics/shopify.js";
const ANALYTICS_SOURCEMAP_LOCAL_URL = `${ANALYTICS_LOCAL_URL}.map`;

const WEBMCP_BUILD_HINT = "pnpm --filter @shopify/webmcp dev";
const ANALYTICS_BUILD_HINT = "pnpm --filter @shopify/storefront-analytics build";

export const LOCAL_CDN_ASSETS = [
  {
    cdnUrl: `${SHOPIFY_CDN_ORIGIN}/storefront/webmcp.js`,
    localUrl: WEBMCP_LOCAL_URL,
    localPath: new URL("../../../packages/webmcp/dist/webmcp.js", import.meta.url),
    contentType: "text/javascript; charset=utf-8",
    buildHint: WEBMCP_BUILD_HINT,
  },
  {
    cdnUrl: `${SHOPIFY_CDN_ORIGIN}/storefront/webmcp.js.map`,
    localUrl: WEBMCP_SOURCEMAP_LOCAL_URL,
    localPath: new URL("../../../packages/webmcp/dist/webmcp.js.map", import.meta.url),
    contentType: "application/json; charset=utf-8",
    buildHint: WEBMCP_BUILD_HINT,
  },
  {
    cdnUrl: `${SHOPIFY_CDN_ORIGIN}/storefront/analytics/shopify.js`,
    localUrl: ANALYTICS_LOCAL_URL,
    localPath: new URL(
      "../../../packages/storefront-analytics/dist/storefront/analytics/shopify.js",
      import.meta.url,
    ),
    contentType: "text/javascript; charset=utf-8",
    buildHint: ANALYTICS_BUILD_HINT,
  },
  {
    cdnUrl: `${SHOPIFY_CDN_ORIGIN}/storefront/analytics/shopify.js.map`,
    localUrl: ANALYTICS_SOURCEMAP_LOCAL_URL,
    localPath: new URL(
      "../../../packages/storefront-analytics/dist/storefront/analytics/shopify.js.map",
      import.meta.url,
    ),
    contentType: "application/json; charset=utf-8",
    buildHint: ANALYTICS_BUILD_HINT,
  },
] satisfies readonly LocalCdnAsset[];

export function rewriteLocalCdnAssetReferences(
  code: string,
  assets: readonly Pick<LocalCdnAsset, "cdnUrl" | "localUrl">[],
) {
  let nextCode = code;

  for (const asset of assets) {
    nextCode = rewriteAssetReferences(nextCode, asset);
  }

  return nextCode;
}

export function getLocalCdnAssetErrorMessage(
  asset: Pick<LocalCdnAsset, "localUrl" | "localPath" | "buildHint">,
  error?: unknown,
) {
  const lines = [
    `Unable to serve ${asset.localUrl} from ${asset.localPath.pathname}.`,
    "Run this from the repository root:",
    asset.buildHint,
  ];

  if (error !== undefined) {
    lines.push("", error instanceof Error ? error.message : String(error));
  }

  return lines.join("\n");
}

export function getLocalCdnAssetPathPattern(assets: readonly Pick<LocalCdnAsset, "cdnUrl">[]) {
  return assets.map(({ cdnUrl }) => escapeRegExp(new URL(cdnUrl).pathname)).join("|") || "(?!)";
}

function rewriteAssetReferences(code: string, asset: Pick<LocalCdnAsset, "cdnUrl" | "localUrl">) {
  const cdnPath = new URL(asset.cdnUrl).pathname;
  const escapedCdnPath = escapeRegExp(cdnPath);
  const shopifyCdnTemplateReference = `\${SHOPIFY_CDN_ORIGIN}${cdnPath}`;

  return code
    .split(asset.cdnUrl)
    .join(asset.localUrl)
    .split(`\`${shopifyCdnTemplateReference}\``)
    .join(JSON.stringify(asset.localUrl))
    .split(`"${shopifyCdnTemplateReference}"`)
    .join(JSON.stringify(asset.localUrl))
    .split(`'${shopifyCdnTemplateReference}'`)
    .join(JSON.stringify(asset.localUrl))
    .replace(
      new RegExp(String.raw`SHOPIFY_CDN_ORIGIN\s*\+\s*(['"])${escapedCdnPath}\1`, "g"),
      JSON.stringify(asset.localUrl),
    );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
