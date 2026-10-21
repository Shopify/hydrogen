import { createAssetResolver } from "@pitlane/assets";
import manifest from "@pitlane/assets/manifest";

import { documentAssetSources } from "./asset-sources.ts";

/** Pitlane's Worker-safe resolver. It implements the metadata `render({ assets })` reads. */
export const assets = createAssetResolver(manifest);

export type DocumentAssets = {
  scriptEntry: Awaited<ReturnType<typeof assets.getScriptEntry>>;
  stylesheets: string[];
};

export async function getDocumentAssets(): Promise<DocumentAssets> {
  const [scriptEntry, stylesheet, serverStylesheets] = await Promise.all([
    assets.getScriptEntry(documentAssetSources.scriptEntry),
    assets.getHref(documentAssetSources.stylesheet),
    assets.getStylesheets("app/entry.server.ts"),
  ]);

  return {
    scriptEntry,
    stylesheets: [...new Set([stylesheet, ...serverStylesheets])],
  };
}
