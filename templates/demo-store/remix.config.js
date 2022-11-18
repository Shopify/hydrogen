/** @type {import('@remix-run/dev').AppConfig} */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const recursive = require('recursive-readdir');

module.exports = {
  ignoredRouteFiles: ['**/.*'],
  async routes() {
    const appDir = path.resolve(__dirname, 'app');
    const routesDir = path.resolve(appDir, 'routes');
    const langDir = path.resolve(routesDir, '$lang');

    const files = await recursive(routesDir, [
      (file) => {
        return file.replace(/\\/g, '/').match(/routes\/\$lang\//);
      },
    ]);

    // eslint-disable-next-line no-console
    console.log(`Duplicating ${files.length} route(s) for translations`);

    for (let file of files) {
      let bundle = await esbuild.build({
        entryPoints: {entry: file},
        bundle: false,
        metafile: true,
        write: false,
      });

      const moduleExports = bundle.metafile.outputs['entry.js'].exports;

      const moduleId =
        '~/' +
        path
          .relative(appDir, file)
          .replace(/\\/g, '/')
          .slice(0, -path.extname(file).length);

      const outFile = path.resolve(langDir, path.relative(routesDir, file));

      fs.mkdirSync(path.dirname(outFile), {recursive: true});
      fs.writeFileSync(
        outFile,
        `export {${moduleExports.join(', ')}} from ${JSON.stringify(
          moduleId,
        )};\n`,
      );
    }

    return {};
    // Figure out why this won't work
    //
    // return defineRoutes((route) => {
    //   for (let file of files) {
    //     const relativeFilePath = file.replace(__dirname + "/app/routes/", "");
    //     route("*/" + relativeFilePath, "routes/" + relativeFilePath);

    //     console.log("/*/" + relativeFilePath, "routes/" + relativeFilePath);
    //   }
    // });
  },
};
