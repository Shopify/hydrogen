import { joinPath, resolvePath, dirname, basename } from '@shopify/cli-kit/node/path';
import { findFileWithExtension } from './file.js';
import { createRequire } from 'module';

const require2 = createRequire(import.meta.url);
async function hasViteConfig(root) {
  const result = await findFileWithExtension(root, "vite.config");
  return !!result.filepath;
}
async function getViteConfig(root, ssrEntryFlag) {
  const vitePath = require2.resolve("vite", { paths: [root] });
  const viewNodePath = joinPath(vitePath, "..", "dist", "node", "index.js");
  const vite = await import(viewNodePath);
  const command = "build";
  const mode = process.env.NODE_ENV || "production";
  const maybeConfig = await vite.loadConfigFromFile(
    { command, mode, isSsrBuild: true },
    void 0,
    root
  );
  if (!maybeConfig || !maybeConfig.path) {
    throw new Error("No Vite config found");
  }
  const resolvedViteConfig = await vite.resolveConfig(
    { root, build: { ssr: true } },
    command,
    mode,
    mode
  );
  const { appDirectory, serverBuildFile, routes } = getRemixConfigFromVite(resolvedViteConfig);
  const serverOutDir = resolvedViteConfig.build.outDir;
  const clientOutDir = serverOutDir.replace(/server$/, "client");
  const rollupOutput = resolvedViteConfig.build.rollupOptions.output;
  const { entryFileNames } = (Array.isArray(rollupOutput) ? rollupOutput[0] : rollupOutput) ?? {};
  const serverOutFile = joinPath(
    serverOutDir,
    typeof entryFileNames === "string" ? entryFileNames : serverBuildFile ?? "index.js"
  );
  const ssrEntry = ssrEntryFlag ?? resolvedViteConfig.build.ssr;
  const resolvedSsrEntry = resolvePath(
    resolvedViteConfig.root,
    typeof ssrEntry === "string" ? ssrEntry : "server"
  );
  return {
    clientOutDir,
    serverOutDir,
    serverOutFile,
    resolvedViteConfig,
    userViteConfig: maybeConfig.config,
    remixConfig: {
      routes: routes ?? {},
      appDirectory: appDirectory ?? joinPath(resolvedViteConfig.root, "app"),
      rootDirectory: resolvedViteConfig.root,
      serverEntryPoint: (await findFileWithExtension(
        dirname(resolvedSsrEntry),
        basename(resolvedSsrEntry)
      )).filepath || resolvedSsrEntry
    }
  };
}
function getRemixConfigFromVite(viteConfig) {
  const { remixConfig } = findHydrogenPlugin(viteConfig)?.api?.getPluginOptions() ?? {};
  return remixConfig ? {
    appDirectory: remixConfig.appDirectory,
    serverBuildFile: remixConfig.serverBuildFile,
    routes: remixConfig.routes
  } : {};
}
function findPlugin(config, name) {
  return config.plugins.find((plugin) => plugin.name === name);
}
function findHydrogenPlugin(config) {
  return findPlugin(config, "hydrogen:main");
}
function findOxygenPlugin(config) {
  return findPlugin(config, "oxygen:main");
}

export { findHydrogenPlugin, findOxygenPlugin, getViteConfig, hasViteConfig };
