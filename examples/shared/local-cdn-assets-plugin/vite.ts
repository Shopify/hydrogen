import { readFile } from "node:fs/promises";
import type { ServerResponse } from "node:http";

import {
  getLocalCdnAssetErrorMessage,
  LOCAL_CDN_ASSETS,
  rewriteLocalCdnAssetReferences,
  type LocalCdnAsset,
} from "./common";

export type LocalCdnAssetsOptions = {
  assets?: readonly LocalCdnAsset[];
};

type ViteDevServerLike = {
  middlewares: {
    use(
      handler: (request: { url?: string }, response: ServerResponse, next: () => void) => void,
    ): void;
  };
};

export function localCdnAssets({ assets = LOCAL_CDN_ASSETS }: LocalCdnAssetsOptions = {}) {
  return {
    name: "local-cdn-assets",
    apply: "serve" as const,
    enforce: "pre" as const,
    config() {
      return {
        optimizeDeps: {
          exclude: ["@shopify/hydrogen", "@shopify/hydrogen/react", "@shopify/hydrogen/vue"],
        },
      };
    },
    configureServer(server: ViteDevServerLike) {
      server.middlewares.use((request, response, next) => {
        const requestPath = getRequestPath(request.url);
        const asset = assets.find(({ localUrl }) => localUrl === requestPath);
        if (!asset) {
          next();
          return;
        }

        void serveLocalCdnAsset(asset, response);
      });
    },
    transform(code: string) {
      const nextCode = rewriteLocalCdnAssetReferences(code, assets);

      return nextCode === code ? null : nextCode;
    },
  };
}

async function serveLocalCdnAsset(asset: LocalCdnAsset, response: ServerResponse) {
  try {
    const source = await readFile(asset.localPath);
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": asset.contentType,
    });
    response.end(source);
  } catch (error) {
    response.writeHead(500, {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    });
    response.end(getLocalCdnAssetErrorMessage(asset, error));
  }
}

function getRequestPath(requestUrl: string | undefined) {
  return requestUrl?.split("?", 1)[0];
}
