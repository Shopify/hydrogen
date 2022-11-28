import fs from 'fs';
import esbuild from 'esbuild';
import readDir from 'recursive-readdir';
import path from 'path';

export type HydrogenRouteOptions = {
  prefixLocalizedRoutes?: boolean;
};

export async function hydrogenRoutes(
  defineRoutes: any,
  options: HydrogenRouteOptions = {},
) {
  if (options.prefixLocalizedRoutes) {
    await buildLangRoutes();
  }

  const templatesPath = path.resolve(__dirname, '../../templates');

  // fs.copyFileSync(templatesPath)

  // const templates = await readDir(templatesPath);

  // for (const template of templates) {
  //   console.log(template);
  // }

  // @todo - extract into packaged helper function
  // @todo - add logic for i18n
  // const appRoutesPath = path.resolve(
  //   '../../templates/demo-store',
  //   'app/routes',
  // );
  // @todo - generalize from `path.cwd()`
  // const appRouteFiles = await readDir(appRoutesPath);
  const hydrogenRoutesPath = path.resolve(process.cwd(), '.hydrogen/routes');
  const hydrogenRouteFiles = await readDir(hydrogenRoutesPath);
  return defineRoutes((route: any) => {
    for (const hydrogenRoute of hydrogenRouteFiles) {
      const hydrogenRoutePath = path.relative(process.cwd(), hydrogenRoute);

      const hydrogenRouteUrl = hydrogenRoutePath.substring(
        hydrogenRoutePath.lastIndexOf('/'),
        hydrogenRoutePath.lastIndexOf('.'),
      );

      route(hydrogenRouteUrl, '../' + hydrogenRoutePath);
    }
  });
}

async function buildLangRoutes() {
  const appDir = path.resolve(process.cwd(), 'app');
  const routesDir = path.resolve(appDir, 'routes');
  const langDir = path.resolve(routesDir, '$lang');

  const files = await readDir(routesDir, [
    (file) => {
      return !!file.replace(/\\/g, '/').match(/routes\/\$lang\//);
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

    const moduleExports = bundle?.metafile?.outputs['entry.js'].exports;

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
      `export {${moduleExports!.join(', ')}} from ${JSON.stringify(
        moduleId,
      )};\n`,
    );
  }
}
