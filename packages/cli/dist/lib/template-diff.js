import { rmdirSync } from 'node:fs';
import { temporaryDirectory } from 'tempy';
import { createSymlink, copy } from 'fs-extra/esm';
import { copyFile, removeFile, fileExists } from '@shopify/cli-kit/node/fs';
import { joinPath, relativePath } from '@shopify/cli-kit/node/path';
import { readAndParsePackageJson } from '@shopify/cli-kit/node/node-package-manager';
import colors from '@shopify/cli-kit/node/colors';
import { getRepoNodeModules, getStarterDir } from './build.js';
import { mergePackageJson } from './file.js';

async function prepareDiffDirectory(diffDirectory, watch) {
  const targetDirectory = temporaryDirectory({ prefix: "tmp-hydrogen-diff-" });
  process.on("exit", () => rmdirSync(targetDirectory, { recursive: true }));
  console.info(
    `
-- Applying diff to starter template in
${colors.dim(
      targetDirectory
    )}
`
  );
  await applyTemplateDiff(targetDirectory, diffDirectory);
  await createSymlink(
    await getRepoNodeModules(),
    joinPath(targetDirectory, "node_modules")
  );
  if (watch) {
    const pw = await import('@parcel/watcher').catch((error) => {
      console.log("Could not watch for file changes.", error);
    });
    pw?.subscribe(
      targetDirectory,
      (error, events) => {
        if (error) {
          console.error(error);
          return;
        }
        events.map((event) => {
          return copyFile(
            event.path,
            joinPath(diffDirectory, relativePath(targetDirectory, event.path))
          );
        });
      },
      { ignore: ["!*.generated.d.ts"] }
    );
    pw?.subscribe(
      diffDirectory,
      async (error, events) => {
        if (error) {
          console.error(error);
          return;
        }
        await events.map((event) => {
          const targetFile = joinPath(
            targetDirectory,
            relativePath(diffDirectory, event.path)
          );
          return event.type === "delete" ? removeFile(targetFile).catch(() => {
          }) : copyFile(event.path, targetFile);
        });
      },
      { ignore: ["*.generated.d.ts", "package.json", "tsconfig.json"] }
    );
  }
  return targetDirectory;
}
async function applyTemplateDiff(targetDirectory, diffDirectory, templateDir = getStarterDir()) {
  const diffPkgJson = await readAndParsePackageJson(
    joinPath(diffDirectory, "package.json")
  );
  const diffOptions = diffPkgJson["h2:diff"] ?? {};
  const createFilter = (re, skipFiles) => (filepath) => {
    const filename = relativePath(templateDir, filepath);
    return !re.test(filename) && !skipFiles?.includes(filename);
  };
  await copy(templateDir, targetDirectory, {
    filter: createFilter(
      /(^|\/|\\)(dist|node_modules|\.cache|.turbo|CHANGELOG\.md)(\/|\\|$)/i,
      diffOptions.skipFiles || []
    )
  });
  await copy(diffDirectory, targetDirectory, {
    filter: createFilter(
      /(^|\/|\\)(dist|node_modules|\.cache|.turbo|package\.json|tsconfig\.json)(\/|\\|$)/i
    )
  });
  await mergePackageJson(diffDirectory, targetDirectory, {
    ignoredKeys: ["h2:diff"],
    onResult: (pkgJson) => {
      for (const key of ["build", "dev"]) {
        const scriptLine = pkgJson.scripts?.[key];
        if (pkgJson.scripts?.[key] && typeof scriptLine === "string") {
          pkgJson.scripts[key] = scriptLine.replace(/\s+--diff/, "");
        }
      }
      if (diffOptions.skipDependencies && pkgJson.dependencies) {
        for (const dep of diffOptions.skipDependencies) {
          delete pkgJson.dependencies[dep];
        }
      }
      if (diffOptions.skipDevDependencies && pkgJson.devDependencies) {
        for (const devDep of diffOptions.skipDevDependencies) {
          delete pkgJson.devDependencies[devDep];
        }
      }
      return pkgJson;
    }
  });
}
async function copyDiffBuild(generatedDirectory, diffDirectory) {
  const target = joinPath(diffDirectory, "dist");
  await removeFile(target);
  await Promise.all([
    copy(joinPath(generatedDirectory, "dist"), target, {
      overwrite: true
    }),
    copyFile(
      joinPath(generatedDirectory, ".env"),
      joinPath(diffDirectory, ".env")
    )
  ]);
}
async function copyShopifyConfig(generatedDirectory, diffDirectory) {
  const source = joinPath(generatedDirectory, ".shopify");
  if (!await fileExists(source))
    return;
  const target = joinPath(diffDirectory, ".shopify");
  await removeFile(target);
  await copy(joinPath(generatedDirectory, ".shopify"), target, {
    overwrite: true
  });
}

export { applyTemplateDiff, copyDiffBuild, copyShopifyConfig, prepareDiffDirectory };
