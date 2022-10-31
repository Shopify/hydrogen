const fs = require("fs");
const path = require("path");

const esbuild = require("esbuild");
const recursive = require("recursive-readdir");

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  publicPath: (process.env.HYDROGEN_ASSET_BASE_URL || '/') + 'build/',
  serverModuleFormat: 'esm',
  serverBuildTarget: 'cloudflare-workers',
  serverBuildPath: 'build/server/index.js',
  assetsBuildDirectory: 'build/client/build',
  devServerBroadcastDelay: 1000,
  devServerPort: 8002,
  ignoredRouteFiles: ["**/.*"],
  async routes() {
    /**
     * Generates the re-export route files under $lang for url path localization
     * Note: This is temporary until we can assign multiple routes to a single route
     */
    const appDir = path.resolve("app");
    const routesDir = path.resolve(appDir, "routes");
    const langDir = path.resolve(routesDir, "$lang");

    const files = await recursive(routesDir, [
      (file) => {
        return (
          file.replace(/\\/g, "/").match(/routes\/\$lang\//)
        );
      },
    ]);

    console.log(`Duplicating ${files.length} route(s) for translations`);

    for (let file of files) {
      let bundle = await esbuild.build({
        entryPoints: { entry: file },
        bundle: false,
        metafile: true,
        write: false,
      });

      const moduleExports = bundle.metafile.outputs["entry.js"].exports;

      const moduleId =
        "~/" +
        path
          .relative(appDir, file)
          .replace(/\\/g, "/")
          .slice(0, -path.extname(file).length);

      const outFile = path.resolve(langDir, path.relative(routesDir, file));

      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(
        outFile,
        `export {${moduleExports.join(", ")}} from ${JSON.stringify(
          moduleId
        )};\n`
      );
    }

    return {};
  },
};
