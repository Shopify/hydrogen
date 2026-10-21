import { rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ASSETS_MANIFEST_FILE } from "@pitlane/assets/vite-plugin";
import { remix } from "@pitlane/vite-plugin-remix";
import type { OxygenPlugin } from "@shopify/mini-oxygen/vite";
import { build, type Plugin, type PluginOption } from "vite";

import { browserBoundary, documentAssetSources } from "../app/asset-sources.ts";

interface RemixOxygenOptions {
  compatibilityDate: string;
}

/**
 * Pitlane's Remix integration, finished into the single Worker that Oxygen deploys.
 *
 * - Pitlane builds the client and server environments, rewrites `clientEntry()` islands
 *   to portable identities, and writes an asset manifest for `@pitlane/assets`.
 * - MiniOxygen (registered separately in `vite.config.ts`) serves `vite dev` and
 *   `vite preview` from the Worker entry, so Pitlane's own fetch server stays off.
 * - After both builds, this plugin re-bundles the Worker with the manifest inlined,
 *   because Oxygen uploads only `index.js` and `oxygen.json` from `dist/server`.
 */
export function remixOxygen({ compatibilityDate }: RemixOxygenOptions): PluginOption {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(compatibilityDate)) {
    throw new Error(`Invalid Oxygen compatibility date: ${compatibilityDate}`);
  }

  const oxygenWorker: Plugin = {
    name: "remix-oxygen:worker",
    config(_config, { command }) {
      // `shopify hydrogen deploy` passes each deployment's CDN prefix, so assets stay
      // reachable at their own URLs after later deployments replace this one.
      const assetBase = process.env.HYDROGEN_ASSET_BASE_URL;
      return {
        base: command === "build" && assetBase ? assetBase : undefined,
        environments: {
          ssr: {
            build: {
              outDir: "dist/server",
              copyPublicDir: false,
              rolldownOptions: { output: { codeSplitting: false } },
            },
          },
        },
      };
    },
    configResolved(config) {
      // Pin the same compatibility date for MiniOxygen's dev runtime.
      const oxygenPlugin = config.plugins.find((plugin) => plugin.name === "oxygen:main") as
        | OxygenPlugin
        | undefined;
      // Fail loudly, so dev and the deployed Worker can't silently run different dates.
      if (!oxygenPlugin?.api) {
        throw new Error("MiniOxygen plugin API is unavailable. Add oxygen() before remixOxygen().");
      }
      oxygenPlugin.api.registerPluginOptions({ compatibilityDate });
    },
    buildApp: {
      // Runs after Pitlane has built both environments and written its manifest.
      order: "post",
      async handler(builder) {
        const ssr = builder.environments.ssr;
        if (!ssr) throw new Error("Expected an `ssr` environment for the Oxygen Worker.");
        const outDir = resolve(builder.config.root, ssr.config.build.outDir);
        const output = await build({
          configFile: false,
          root: builder.config.root,
          logLevel: builder.config.logLevel,
          ssr: { noExternal: true, target: "webworker" },
          build: {
            ssr: resolve(outDir, "index.js"),
            outDir,
            emptyOutDir: false,
            copyPublicDir: false,
            target: "esnext",
            minify: ssr.config.build.minify,
            sourcemap: ssr.config.build.sourcemap,
            rolldownOptions: {
              output: { entryFileNames: "index.js", codeSplitting: false },
            },
          },
        });
        const chunks =
          "output" in output ? output.output.filter((file) => file.type === "chunk") : [];
        if (chunks.length !== 1 || chunks[0]?.imports.length) {
          throw new Error("Expected one self-contained Oxygen Worker module.");
        }
        await rm(resolve(outDir, ASSETS_MANIFEST_FILE));
        await writeFile(
          resolve(outDir, "oxygen.json"),
          JSON.stringify({ version: 1, compatibility_date: compatibilityDate }, null, 2),
        );
      },
    },
  };

  return [
    remix({
      serverEntry: "app/entry.server.ts",
      clientEntry: documentAssetSources.scriptEntry,
      serverHandler: false,
      assets: {
        // Chunk import maps need Vite 8.1. The monorepo's examples share Vite 8.0, so the
        // client build keeps hashed import specifiers instead.
        chunkImportMap: false,
        ...browserBoundary,
        include: [documentAssetSources.stylesheet],
      },
    }),
    oxygenWorker,
  ];
}
