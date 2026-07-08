"use strict";

module.exports = function localCdnAssetsTurbopackLoader(source) {
  const options = typeof this.getOptions === "function" ? this.getOptions() : {};
  const assets = Array.isArray(options.assets) ? options.assets : [];

  return rewriteLocalCdnAssetReferences(String(source), assets);
};

function rewriteLocalCdnAssetReferences(code, assets) {
  let nextCode = code;

  for (const asset of assets) {
    nextCode = rewriteAssetReferences(nextCode, asset);
  }

  return nextCode;
}

function rewriteAssetReferences(code, asset) {
  const cdnPath = new URL(asset.cdnUrl).pathname;
  const escapedCdnPath = escapeRegExp(cdnPath);
  const shopifyCdnTemplateReference = "${SHOPIFY_CDN_ORIGIN}" + cdnPath;

  return code
    .split(asset.cdnUrl)
    .join(asset.localUrl)
    .split("`" + shopifyCdnTemplateReference + "`")
    .join(JSON.stringify(asset.localUrl))
    .split('"' + shopifyCdnTemplateReference + '"')
    .join(JSON.stringify(asset.localUrl))
    .split("'" + shopifyCdnTemplateReference + "'")
    .join(JSON.stringify(asset.localUrl))
    .replace(
      new RegExp(String.raw`SHOPIFY_CDN_ORIGIN\s*\+\s*(['"])${escapedCdnPath}\1`, "g"),
      JSON.stringify(asset.localUrl),
    );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
