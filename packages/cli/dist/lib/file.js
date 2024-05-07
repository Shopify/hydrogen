import { readdir } from 'node:fs/promises';
import { resolvePath, joinPath } from '@shopify/cli-kit/node/path';
import { readFile, writeFile, isDirectory, fileExists } from '@shopify/cli-kit/node/fs';
import { readAndParsePackageJson, writePackageJSON } from '@shopify/cli-kit/node/node-package-manager';
import { formatCode } from './format-code.js';

async function replaceFileContent(filepath, formatConfig, replacer) {
  let content = await replacer(await readFile(filepath));
  if (typeof content !== "string")
    return;
  if (formatConfig) {
    content = await formatCode(content, formatConfig, filepath);
  }
  return writeFile(filepath, content);
}
const DEFAULT_EXTENSIONS = [
  "tsx",
  "ts",
  "jsx",
  "js",
  "mjs",
  "cjs"
];
async function findFileWithExtension(directory, fileBase, extensions = DEFAULT_EXTENSIONS) {
  const dirFiles = await readdir(directory);
  if (dirFiles.includes(fileBase)) {
    const filepath = resolvePath(directory, fileBase);
    if (!await isDirectory(filepath)) {
      return { filepath };
    }
    for (const extension of ["ts", "js"]) {
      const filepath2 = resolvePath(directory, `${fileBase}/index.${extension}`);
      if (await fileExists(resolvePath(directory, filepath2))) {
        return { filepath: filepath2, extension, astType: extension };
      }
    }
  } else {
    for (const extension of extensions) {
      const filename = `${fileBase}.${extension}`;
      if (dirFiles.includes(filename)) {
        const astType = extension === "mjs" || extension === "cjs" ? "js" : extension;
        return { filepath: resolvePath(directory, filename), extension, astType };
      }
    }
  }
  return {};
}
const MANAGED_PACKAGE_JSON_KEYS = Object.freeze([
  "dependencies",
  "devDependencies",
  "peerDependencies"
]);
async function mergePackageJson(sourceDir, targetDir, options) {
  const targetPkgJson = await readAndParsePackageJson(
    joinPath(targetDir, "package.json")
  );
  const sourcePkgJson = await readAndParsePackageJson(
    joinPath(sourceDir, "package.json")
  );
  const ignoredKeys = /* @__PURE__ */ new Set(["comment", ...options?.ignoredKeys ?? []]);
  const unmanagedKeys = Object.keys(sourcePkgJson).filter(
    (key) => !MANAGED_PACKAGE_JSON_KEYS.includes(key)
  );
  for (const key of unmanagedKeys) {
    if (ignoredKeys.has(key))
      continue;
    const sourceValue = sourcePkgJson[key];
    const targetValue = targetPkgJson[key];
    const newValue = Array.isArray(sourceValue) && Array.isArray(targetValue) ? [...targetValue, ...sourceValue] : typeof sourceValue === "object" && typeof targetValue === "object" ? { ...targetValue, ...sourceValue } : sourceValue;
    targetPkgJson[key] = newValue;
  }
  const remixVersion = Object.entries(targetPkgJson.dependencies || {}).find(
    ([dep]) => dep.startsWith("@remix-run/")
  )?.[1];
  for (const key of MANAGED_PACKAGE_JSON_KEYS) {
    if (ignoredKeys.has(key))
      continue;
    if (sourcePkgJson[key]) {
      targetPkgJson[key] = [
        .../* @__PURE__ */ new Set([
          ...Object.keys(targetPkgJson[key] ?? {}),
          ...Object.keys(sourcePkgJson[key] ?? {})
        ])
      ].sort().reduce((acc, dep) => {
        let version = sourcePkgJson[key]?.[dep] ?? targetPkgJson[key]?.[dep];
        if (dep.startsWith("@remix-run/") && remixVersion) {
          version = remixVersion;
        }
        acc[dep] = version;
        return acc;
      }, {});
    }
  }
  await writePackageJSON(
    targetDir,
    options?.onResult?.(targetPkgJson) ?? targetPkgJson
  );
}

export { findFileWithExtension, mergePackageJson, replaceFileContent };
