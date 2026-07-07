import { existsSync, lstatSync, mkdirSync, readlinkSync, symlinkSync, unlinkSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { getLocalCdnAssetPathPattern, LOCAL_CDN_ASSETS, type LocalCdnAsset } from "./common";

type JsonValue = boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type TurbopackLoaderItem =
  | string
  | {
      loader: string;
      options?: Record<string, JsonValue>;
    };

type TurbopackRuleCondition =
  | "browser"
  | "foreign"
  | "development"
  | "production"
  | "node"
  | "edge-light"
  | { all: TurbopackRuleCondition[] }
  | { any: TurbopackRuleCondition[] }
  | { not: TurbopackRuleCondition }
  | {
      path?: string | RegExp;
      content?: RegExp;
      query?: string | RegExp;
      contentType?: string | RegExp;
    };

type TurbopackRuleConfigItem = {
  loaders?: TurbopackLoaderItem[];
  as?: string;
  condition?: TurbopackRuleCondition;
  type?:
    | "asset"
    | "ecmascript"
    | "typescript"
    | "css"
    | "css-module"
    | "wasm"
    | "raw"
    | "node"
    | "bytes"
    | "text";
};

type TurbopackRuleConfigCollection =
  | TurbopackRuleConfigItem
  | (TurbopackLoaderItem | TurbopackRuleConfigItem)[];

type LocalCdnAssetsTurbopackOptions = {
  assets?: readonly LocalCdnAsset[];
  publicDirectory?: string;
};

const LOADER_PATH = fileURLToPath(new URL("./turbopack-loader.cjs", import.meta.url));
const TURBOPACK_REWRITE_RULE_GLOBS = ["*.js", "*.mjs", "*.cjs", "*.jsx"];

export function localCdnAssetsTurbopackRules(
  options: LocalCdnAssetsTurbopackOptions = {},
): Record<string, TurbopackRuleConfigCollection> {
  if (process.env.NODE_ENV !== "production") {
    ensureLocalCdnAssetSymlinks(options);
  }

  const assets = options.assets ?? LOCAL_CDN_ASSETS;
  const loader = getLocalCdnAssetsLoader(assets);
  const condition = getDevelopmentLocalCdnReferenceCondition(assets);
  const rules: Record<string, TurbopackRuleConfigCollection> = {};

  for (const glob of TURBOPACK_REWRITE_RULE_GLOBS) {
    rules[glob] = appendLoader(undefined, loader, condition);
  }

  return rules;
}

function getDevelopmentLocalCdnReferenceCondition(
  assets: readonly LocalCdnAsset[],
): TurbopackRuleCondition {
  return {
    all: ["development", { content: new RegExp(getLocalCdnAssetPathPattern(assets)) }],
  };
}

function ensureLocalCdnAssetSymlinks({
  assets = LOCAL_CDN_ASSETS,
  publicDirectory = join(process.cwd(), "public"),
}: LocalCdnAssetsTurbopackOptions = {}) {
  for (const asset of assets) {
    ensureSymlink(fileURLToPath(asset.localPath), join(publicDirectory, asset.localUrl));
  }
}

function getLocalCdnAssetsLoader(assets: readonly LocalCdnAsset[]): TurbopackLoaderItem {
  return {
    loader: LOADER_PATH,
    options: {
      assets: assets.map(({ cdnUrl, localUrl }) => ({ cdnUrl, localUrl })),
    },
  };
}

function appendLoader(
  rule: TurbopackRuleConfigCollection | undefined,
  loader: TurbopackLoaderItem,
  condition: TurbopackRuleCondition,
): TurbopackRuleConfigCollection {
  const ruleItem = {
    loaders: [loader],
    condition,
  };

  if (rule === undefined) return ruleItem;

  if (Array.isArray(rule)) {
    return [...rule, ruleItem];
  }

  return {
    ...rule,
    loaders: [...(rule.loaders ?? []), loader],
    condition: rule.condition ? { all: [rule.condition, condition] } : condition,
  };
}

function ensureSymlink(sourcePath: string, destinationPath: string) {
  mkdirSync(dirname(destinationPath), { recursive: true });

  if (existsSync(destinationPath)) {
    const stats = lstatSync(destinationPath);
    if (!stats.isSymbolicLink()) return;

    const currentTarget = readlinkSync(destinationPath);
    if (
      currentTarget === sourcePath ||
      currentTarget === relative(dirname(destinationPath), sourcePath)
    ) {
      return;
    }

    unlinkSync(destinationPath);
  }

  symlinkSync(relative(dirname(destinationPath), sourcePath), destinationPath);
}
