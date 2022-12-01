import fs from 'fs';
import readDir from 'recursive-readdir';
import path from 'path';

export type HydrogenRouteOptions = {};

export async function hydrogenRoutes(
  defineRoutes: any,
  options: HydrogenRouteOptions = {},
) {
  await copyTemplates();

  const hydrogenRoutesPath = path.resolve(process.cwd(), '.hydrogen/routes');
  const hydrogenRouteFiles = await readDir(hydrogenRoutesPath);
  return defineRoutes((route: any) => {
    for (const hydrogenRoute of hydrogenRouteFiles) {
      const routeFilePath = path.relative(process.cwd(), hydrogenRoute);

      const routeUrlPath = createRoutePath(
        path.relative(hydrogenRoutesPath, routeFilePath),
      );

      route(routeUrlPath, '../' + routeFilePath);
    }
  });
}

async function copyTemplates() {
  const templateDirectory = path.resolve(__dirname, '../../templates');
  const templates = await readDir(templateDirectory);
  const hydrogenDirectory = path.resolve(process.cwd(), '.hydrogen');

  for (const template of templates) {
    const destination = path.resolve(
      hydrogenDirectory,
      path.relative(templateDirectory, path.dirname(template)),
      path.basename(template),
    );

    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.copyFileSync(template, destination);
  }
}

/**
 * Generate a URL path based on remix file conventions. This is copied from:
 * https://github.com/remix-run/remix/blob/09296128ca2f2d5e8932c631e777fbe8baaa192d/packages/remix-dev/config/routesConvention.ts#L116
 */
function createRoutePath(partialRouteId: string): string | undefined {
  // remove file extension
  partialRouteId = partialRouteId.substring(0, partialRouteId.lastIndexOf('.'));
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
