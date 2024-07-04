import { outputInfo, outputContent, outputToken, outputWarn } from '@shopify/cli-kit/node/output';
import { rmdir, fileSize, glob, readFile, writeFile, fileExists, copyFile } from '@shopify/cli-kit/node/fs';
import { relativePath, joinPath } from '@shopify/cli-kit/node/path';
import { getPackageManager } from '@shopify/cli-kit/node/node-package-manager';
import colors from '@shopify/cli-kit/node/colors';
import { getProjectPaths, getRemixConfig, handleRemixImportFail, assertOxygenChecks } from '../remix-config.js';
import { checkLockfileStatus } from '../check-lockfile.js';
import { findMissingRoutes } from '../missing-routes.js';
import { muteRemixLogs, createRemixLogger } from '../log.js';
import { codegen } from '../codegen.js';
import { buildBundleAnalysis, getBundleAnalysisSummary } from '../bundle/analyzer.js';
import { isCI } from '../is-ci.js';
import { importLocal } from '../import-utils.js';

const LOG_WORKER_BUILT = "\u{1F4E6} Worker built";
const WORKER_BUILD_SIZE_LIMIT = 5;
async function runClassicCompilerBuild({
  directory,
  useCodegen = false,
  codegenConfigPath,
  sourcemap = false,
  disableRouteWarning = false,
  bundleStats = true,
  lockfileCheck = true,
  assetPath
}) {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production";
  }
  if (assetPath) {
    process.env.HYDROGEN_ASSET_BASE_URL = assetPath;
  }
  const { root, buildPath, buildPathClient, buildPathWorkerFile, publicPath } = getProjectPaths(directory);
  if (lockfileCheck) {
    await checkLockfileStatus(root, isCI());
  }
  await muteRemixLogs(root);
  console.time(LOG_WORKER_BUILT);
  outputInfo(`
\u{1F3D7}\uFE0F  Building in ${process.env.NODE_ENV} mode...`);
  const [remixConfig, [{ build }, { logThrown }, { createFileWatchCache }]] = await Promise.all([
    getRemixConfig(root),
    Promise.all([
      importLocal("@remix-run/dev/dist/compiler/build.js", root),
      importLocal(
        "@remix-run/dev/dist/compiler/utils/log.js",
        root
      ),
      importLocal(
        "@remix-run/dev/dist/compiler/fileWatchCache.js",
        root
      )
    ]).catch(handleRemixImportFail),
    rmdir(buildPath, { force: true })
  ]);
  assertOxygenChecks(remixConfig);
  await Promise.all([
    copyPublicFiles(publicPath, buildPathClient),
    build({
      config: remixConfig,
      options: {
        mode: process.env.NODE_ENV,
        sourcemap
      },
      logger: createRemixLogger(),
      fileWatchCache: createFileWatchCache()
    }).catch((thrown) => {
      logThrown(thrown);
      if (process.env.SHOPIFY_UNIT_TEST) {
        throw thrown;
      } else {
        process.exit(1);
      }
    }),
    useCodegen && codegen({ ...remixConfig, configFilePath: codegenConfigPath })
  ]);
  if (process.env.NODE_ENV !== "development") {
    console.timeEnd(LOG_WORKER_BUILT);
    const bundleAnalysisPath = await buildBundleAnalysis(buildPath);
    const sizeMB = await fileSize(buildPathWorkerFile) / (1024 * 1024);
    const formattedSize = colors.yellow(sizeMB.toFixed(2) + " MB");
    outputInfo(
      outputContent`   ${colors.dim(
        relativePath(root, buildPathWorkerFile)
      )}  ${bundleAnalysisPath ? outputToken.link(formattedSize, bundleAnalysisPath) : formattedSize}\n`
    );
    if (bundleStats && bundleAnalysisPath) {
      outputInfo(
        outputContent`${await getBundleAnalysisSummary(buildPathWorkerFile) || "\n"}\n    │\n    └─── ${outputToken.link(
          "Complete analysis: " + bundleAnalysisPath,
          bundleAnalysisPath
        )}\n\n`
      );
    }
    if (sizeMB >= WORKER_BUILD_SIZE_LIMIT) {
      outputWarn(
        `\u{1F6A8} Smaller worker bundles are faster to deploy and run.${remixConfig.serverMinify ? "" : "\n   Minify your bundle by adding `serverMinify: true` to remix.config.js."}
   Learn more about optimizing your worker bundle file: https://h2o.fyi/debugging/bundle-size
`
      );
    }
  }
  if (!disableRouteWarning) {
    const missingRoutes = findMissingRoutes(remixConfig);
    if (missingRoutes.length) {
      const packageManager = await getPackageManager(root);
      const exec = packageManager === "npm" ? "npx" : packageManager;
      outputWarn(
        `Heads up: Shopify stores have a number of standard routes that aren\u2019t set up yet.
Some functionality and backlinks might not work as expected until these are created or redirects are set up.
This build is missing ${missingRoutes.length} route${missingRoutes.length > 1 ? "s" : ""}. For more details, run \`${exec} shopify hydrogen check routes\`.
`
      );
    }
  }
  if (process.env.NODE_ENV !== "development") {
    await cleanClientSourcemaps(buildPathClient);
  }
}
async function cleanClientSourcemaps(buildPathClient) {
  const bundleFiles = await glob(joinPath(buildPathClient, "**/*.js"));
  await Promise.all(
    bundleFiles.map(async (filePath) => {
      const file = await readFile(filePath);
      return await writeFile(
        filePath,
        file.replace(/\/\/# sourceMappingURL=.+\.js\.map$/gm, "")
      );
    })
  );
}
async function copyPublicFiles(publicPath, buildPathClient) {
  if (!await fileExists(publicPath)) {
    return;
  }
  return copyFile(publicPath, buildPathClient);
}

export { copyPublicFiles, runClassicCompilerBuild };
