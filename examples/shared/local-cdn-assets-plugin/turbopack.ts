import { lstatSync, mkdirSync, readlinkSync, symlinkSync, unlinkSync } from "node:fs";
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
  createSymlinks?: boolean;
  publicDirectory?: string;
};

const LOADER_PATH = fileURLToPath(new URL("./turbopack-loader.cjs", import.meta.url));
const TURBOPACK_REWRITE_RULE_GLOBS = ["*.js", "*.mjs", "*.cjs", "*.jsx"];

export function localCdnAssetsTurbopackRules(
  options: LocalCdnAssetsTurbopackOptions = {},
): Record<string, TurbopackRuleConfigCollection> {
  if (options.createSymlinks) {
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

  const targetPath = relative(dirname(destinationPath), sourcePath);
  const destinationState = getSymlinkState(sourcePath, targetPath, destinationPath);
  if (destinationState === "matching" || destinationState === "not-symlink") return;

  if (destinationState === "different") {
    removeStaleSymlink(destinationPath);
  }

  try {
    symlinkSync(targetPath, destinationPath);
  } catch (error) {
    if (isNodeErrorCode(error, "EEXIST")) {
      const nextState = getSymlinkState(sourcePath, targetPath, destinationPath);
      if (nextState === "matching" || nextState === "not-symlink") return;
    }

    throw error;
  }
}

function removeStaleSymlink(path: string) {
  try {
    unlinkSync(path);
  } catch (error) {
    if (!isNodeErrorCode(error, "ENOENT")) {
      throw error;
    }
  }
}

function getSymlinkState(
  sourcePath: string,
  targetPath: string,
  destinationPath: string,
): "absent" | "different" | "matching" | "not-symlink" {
  const destinationStats = tryLstat(destinationPath);
  if (!destinationStats) return "absent";
  if (!destinationStats.isSymbolicLink()) return "not-symlink";

  const currentTarget = readlinkSync(destinationPath);
  return currentTarget === sourcePath || currentTarget === targetPath ? "matching" : "different";
}

function tryLstat(path: string) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (isNodeErrorCode(error, "ENOENT")) {
      return undefined;
    }

    throw error;
  }
}

function isNodeErrorCode(error: unknown, code: string) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === code);
}
