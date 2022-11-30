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

  await copyTemplates();

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

      console.log(hydrogenRouteUrl, createRoutePath(hydrogenRouteUrl));
    }
  });
}

async function copyTemplates() {
  const templates = await readDir(path.resolve(__dirname, '../../templates'));

  const hydrogenDirectory = path.resolve(process.cwd(), '.hydrogen');
  const hydrogenRoutesPath = path.resolve(process.cwd(), '.hydrogen/routes');

  if (!fs.existsSync(hydrogenDirectory)) {
    fs.mkdirSync(hydrogenDirectory);
  }

  if (!fs.existsSync(hydrogenRoutesPath)) {
    fs.mkdirSync(hydrogenRoutesPath);
  }

  for (const template of templates) {
    const destination = path.resolve(
      hydrogenDirectory,
      path.basename(path.dirname(template)),
      path.basename(template),
    );
    fs.copyFileSync(template, destination);
  }
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

/**
 * Generate a URL path based on remix file conventions. This is copied from:
 * https://github.com/remix-run/remix/blob/09296128ca2f2d5e8932c631e777fbe8baaa192d/packages/remix-dev/config/routesConvention.ts#L116
 */
function createRoutePath(partialRouteId: string): string | undefined {
  let escapeStart = '[';
  let escapeEnd = ']';
  let result = '';
  let rawSegmentBuffer = '';

  let inEscapeSequence = 0;
  let skipSegment = false;
  for (let i = 0; i < partialRouteId.length; i++) {
    let char = partialRouteId.charAt(i);
    let lastChar = i > 0 ? partialRouteId.charAt(i - 1) : undefined;
    let nextChar =
      i < partialRouteId.length - 1 ? partialRouteId.charAt(i + 1) : undefined;

    function isNewEscapeSequence() {
      return (
        !inEscapeSequence && char === escapeStart && lastChar !== escapeStart
      );
    }

    function isCloseEscapeSequence() {
      return inEscapeSequence && char === escapeEnd && nextChar !== escapeEnd;
    }

    function isStartOfLayoutSegment() {
      return char === '_' && nextChar === '_' && !rawSegmentBuffer;
    }

    if (skipSegment) {
      if (char === '/' || char === '.' || char === path.win32.sep) {
        skipSegment = false;
      }
      continue;
    }

    if (isNewEscapeSequence()) {
      inEscapeSequence++;
      continue;
    }

    if (isCloseEscapeSequence()) {
      inEscapeSequence--;
      continue;
    }

    if (inEscapeSequence) {
      result += char;
      continue;
    }

    if (char === '/' || char === path.win32.sep || char === '.') {
      if (rawSegmentBuffer === 'index' && result.endsWith('index')) {
        result = result.replace(/\/?index$/, '');
      } else {
        result += '/';
      }
      rawSegmentBuffer = '';
      continue;
    }

    if (isStartOfLayoutSegment()) {
      skipSegment = true;
      continue;
    }

    rawSegmentBuffer += char;

    if (char === '$') {
      result += typeof nextChar === 'undefined' ? '*' : ':';
      continue;
    }

    result += char;
  }

  if (rawSegmentBuffer === 'index' && result.endsWith('index')) {
    result = result.replace(/\/?index$/, '');
  }

  return result || undefined;
}
