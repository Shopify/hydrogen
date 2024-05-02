import Command from '@shopify/cli-kit/node/base-command';
import { collectLog, outputWarn } from '@shopify/cli-kit/node/output';
import { removeFile, fileSize } from '@shopify/cli-kit/node/fs';
import { resolvePath, joinPath } from '@shopify/cli-kit/node/path';
import { getPackageManager } from '@shopify/cli-kit/node/node-package-manager';
import { commonFlags, flagsToCamelObject } from '../../lib/flags.js';
import { checkLockfileStatus } from '../../lib/check-lockfile.js';
import { findMissingRoutes } from '../../lib/missing-routes.js';
import { codegen } from '../../lib/codegen.js';
import { isCI } from '../../lib/is-ci.js';
import { prepareDiffDirectory, copyDiffBuild } from '../../lib/template-diff.js';
import { getViteConfig } from '../../lib/vite-config.js';
import { createRequire } from 'module';

const require2 = createRequire(import.meta.url);
const WORKER_BUILD_SIZE_LIMIT = 5;
class Build extends Command {
  static description = "Builds a Hydrogen storefront for production.";
  static flags = {
    ...commonFlags.path,
    ...commonFlags.entry,
    ...commonFlags.sourcemap,
    ...commonFlags.lockfileCheck,
    ...commonFlags.disableRouteWarning,
    ...commonFlags.codegen,
    ...commonFlags.diff
  };
  static hidden = true;
  async run() {
    const { flags } = await this.parse(Build);
    const originalDirectory = flags.path ? resolvePath(flags.path) : process.cwd();
    let directory = originalDirectory;
    if (flags.diff) {
      directory = await prepareDiffDirectory(originalDirectory, false);
    }
    await runViteBuild({
      ...flagsToCamelObject(flags),
      useCodegen: flags.codegen,
      directory
    });
    if (flags.diff) {
      await copyDiffBuild(directory, originalDirectory);
    }
  }
}
async function runViteBuild({
  entry: ssrEntry,
  directory,
  useCodegen = false,
  codegenConfigPath,
  sourcemap = false,
  disableRouteWarning = false,
  lockfileCheck = true,
  assetPath = "/"
}) {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production";
  }
  const root = directory ?? process.cwd();
  if (lockfileCheck) {
    await checkLockfileStatus(root, isCI());
  }
  const vitePath = require2.resolve("vite", { paths: [root] });
  const newPath = joinPath(vitePath, "..", "dist", "node", "index.js");
  const [
    vite,
    { userViteConfig, remixConfig, clientOutDir, serverOutDir, serverOutFile }
  ] = await Promise.all([
    // Avoid static imports because this file is imported by `deploy` command,
    // which must have a hard dependency on 'vite'.
    import(newPath),
    getViteConfig(root, ssrEntry)
  ]);
  const customLogger = vite.createLogger();
  if (process.env.SHOPIFY_UNIT_TEST) {
    customLogger.info = (msg) => collectLog("info", msg);
    customLogger.warn = (msg) => collectLog("warn", msg);
    customLogger.error = (msg) => collectLog("error", msg);
  }
  const serverMinify = userViteConfig.build?.minify ?? true;
  const commonConfig = {
    root,
    mode: process.env.NODE_ENV,
    base: assetPath,
    customLogger
  };
  await vite.build({
    ...commonConfig,
    build: {
      emptyOutDir: true,
      copyPublicDir: true,
      // Disable client sourcemaps in production
      sourcemap: process.env.NODE_ENV !== "production" && sourcemap
    }
  });
  console.log("");
  await vite.build({
    ...commonConfig,
    build: {
      sourcemap,
      ssr: ssrEntry ?? true,
      emptyOutDir: false,
      copyPublicDir: false,
      minify: serverMinify
    }
  });
  await Promise.all([
    removeFile(joinPath(clientOutDir, ".vite")),
    removeFile(joinPath(serverOutDir, ".vite")),
    removeFile(joinPath(serverOutDir, "assets"))
  ]);
  if (useCodegen) {
    await codegen({
      rootDirectory: root,
      appDirectory: remixConfig.appDirectory,
      configFilePath: codegenConfigPath
    });
  }
  if (process.env.NODE_ENV !== "development") {
    const sizeMB = await fileSize(serverOutFile) / (1024 * 1024);
    if (sizeMB >= WORKER_BUILD_SIZE_LIMIT) {
      outputWarn(
        `\u{1F6A8} Smaller worker bundles are faster to deploy and run.${serverMinify ? "" : "\n   Minify your bundle by adding `build.minify: true` to vite.config.js."}
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
}

export { Build as default, runViteBuild };
