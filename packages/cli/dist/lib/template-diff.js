import { temporaryDirectory } from 'tempy';
import { createSymlink, copy } from 'fs-extra/esm';
import { copyFile, fileExists, removeFile } from '@shopify/cli-kit/node/fs';
import { joinPath, relativePath } from '@shopify/cli-kit/node/path';
import { readAndParsePackageJson } from '@shopify/cli-kit/node/node-package-manager';
import { outputInfo } from '@shopify/cli-kit/node/output';
import colors from '@shopify/cli-kit/node/colors';
import { getStarterDir, isHydrogenMonorepo, getRepoNodeModules } from './build.js';
import { mergePackageJson, mergeTsConfig } from './file.js';

async function prepareDiffDirectory(diffDirectory, watch) {
  const targetDirectory = temporaryDirectory({ prefix: "tmp-hydrogen-diff-" });
  outputInfo(
    `
-- Applying diff to starter template in
${colors.dim(
      targetDirectory
    )}
`
  );
  const templateDirectory = await getStarterDir(isHydrogenMonorepo);
  await applyTemplateDiff(targetDirectory, diffDirectory, templateDirectory);
  await createSymlink(
    await getRepoNodeModules(),
    joinPath(targetDirectory, "node_modules")
  );
  const pw = watch ? await import('@parcel/watcher').catch((error) => {
    console.log("Could not watch for file changes.", error);
  }) : void 0;
  const subscriptions = await Promise.all([
    // Copy back the changes in generated d.ts from the
    // temporary directory to the original diff directory.
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
    ),
    // Copy new changes in the original diff directory to
    // the temporary directory.
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
          const fileInTemplate = event.path.replace(
            diffDirectory,
            templateDirectory
          );
          return event.type === "delete" ? fileExists(fileInTemplate).then(
            (exists) => exists ? (
              // Replace it with original file from the starter template.
              copyFile(fileInTemplate, targetFile)
            ) : (
              // Remove the file otherwise.
              removeFile(targetFile)
            )
          ).catch(() => {
          }) : copyFile(event.path, targetFile);
        });
      },
      {
        ignore: [
          "*.generated.d.ts",
          "package.json",
          "tsconfig.json",
          ".shopify"
        ]
      }
    ),
    // Copy new changes in the starter template to the temporary
    // directory only if they don't overwrite the files in the
    // original diff directory, which have higher priority.
    pw?.subscribe(
      templateDirectory,
      async (error, events) => {
        if (error) {
          console.error(error);
          return;
        }
        await events.map(async (event) => {
          const fileInDiff = event.path.replace(
            templateDirectory,
            diffDirectory
          );
          if (await fileExists(fileInDiff)) return;
          const targetFile = joinPath(
            targetDirectory,
            relativePath(templateDirectory, event.path)
          );
          return event.type === "delete" ? removeFile(targetFile).catch(() => {
          }) : copyFile(event.path, targetFile);
        });
      },
      {
        ignore: [
          "*.generated.d.ts",
          "package.json",
          "tsconfig.json",
          ".shopify"
        ]
      }
    )
  ]);
  return {
    /**
     * The temporary directory with the starter template and diff applied.
     */
    targetDirectory,
    /**
     * Removes the temporary directory and stops the file watchers.
     */
    cleanup: async () => {
      await Promise.all(subscriptions.map((sub) => sub?.unsubscribe()));
      await removeFile(targetDirectory);
    },
    /**
     * Brings the `.shopify` directory back to the original project.
     * This is important to keep a reference of the tunnel configuration
     * so that it can be removed in the next run.
     */
    async copyShopifyConfig() {
      const source = joinPath(targetDirectory, ".shopify");
      if (!await fileExists(source)) return;
      const target = joinPath(diffDirectory, ".shopify");
      await removeFile(target);
      await copy(source, target, { overwrite: true });
    },
    /**
     * Brings the `dist` directory back to the original project.
     * This is used to run `h2 preview` with the resulting build.
     */
    async copyDiffBuild() {
      const target = joinPath(diffDirectory, "dist");
      await removeFile(target);
      await Promise.all([
        copy(joinPath(targetDirectory, "dist"), target, {
          overwrite: true
        }),
        copyFile(
          joinPath(targetDirectory, ".env"),
          joinPath(diffDirectory, ".env")
        )
      ]);
    }
  };
}
async function applyTemplateDiff(targetDirectory, diffDirectory, templateDir) {
  templateDir ??= await getStarterDir();
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
      // Do not copy .shopify from skeleton to avoid linking in examples inadvertedly
      /(^|\/|\\)(dist|node_modules|\.cache|\.turbo|\.shopify|CHANGELOG\.md)(\/|\\|$)/i,
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
      if (pkgJson.dependencies) {
        delete pkgJson.dependencies["@shopify/cli-hydrogen"];
      }
      for (const key of ["build", "dev", "preview"]) {
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
  await mergeTsConfig(diffDirectory, targetDirectory);
}

export { applyTemplateDiff, prepareDiffDirectory };
