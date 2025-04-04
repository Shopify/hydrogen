import type {CompilerOptions} from 'ts-morph';
import {glob, readFile, writeFile, removeFile} from '@shopify/cli-kit/node/fs';
import {outputDebug} from '@shopify/cli-kit/node/output';
import {joinPath} from '@shopify/cli-kit/node/path';
import {formatCode, getCodeFormatOptions} from '../format-code.js';
import {transpileFile} from './file.js';
import {findFileWithExtension} from '../file.js';

const DEFAULT_JS_CONFIG: Omit<CompilerOptions, 'jsx'> = {
  checkJs: false,
  target: 'ES2022',
  module: 'ES2022',
  moduleResolution: 'bundler',
  baseUrl: '.',
  paths: {
    '~/*': ['app/*'],
  },
};

// https://code.visualstudio.com/docs/languages/jsconfig#_jsconfig-options
const JS_CONFIG_KEYS = new Set([
  'noLib',
  'target',
  'module',
  'moduleResolution',
  'checkJs',
  'experimentalDecorators',
  'allowSyntheticDefaultImports',
  'baseUrl',
  'paths',
  ...Object.keys(DEFAULT_JS_CONFIG),
]);

function convertConfigToJS(
  tsConfig: {
    include?: string[];
    compilerOptions?: CompilerOptions;
  },
  keepTypes = false,
) {
  const jsConfig = {
    compilerOptions: {...DEFAULT_JS_CONFIG},
  } as typeof tsConfig;

  if (tsConfig.include) {
    jsConfig.include = tsConfig.include
      .filter((s) => keepTypes || !s.endsWith('.d.ts'))
      .map((s) => s.replace(/(?<!\.d)\.ts(x?)$/, '.js$1'));
  }

  if (tsConfig.compilerOptions) {
    for (const key of JS_CONFIG_KEYS) {
      if (tsConfig.compilerOptions[key] !== undefined) {
        jsConfig.compilerOptions![key] = tsConfig.compilerOptions[key];
      }
    }
  }

  return jsConfig;
}

export async function transpileProject(projectDir: string, keepTypes = true) {
  // Change the `routes.ts` file first as that points to a file with a
  // TypeScript extension.
  const routesPath = joinPath(projectDir, 'app/routes.ts');
  const routesFileContent = await readFile(routesPath);
  const replacedRoutesFileContent = routesFileContent.replace(
    './layout.tsx',
    './layout.jsx',
  );
  await writeFile(routesPath, replacedRoutesFileContent);

  const entries = await glob('**/*.+(ts|tsx)', {
    absolute: true,
    cwd: projectDir,
    dot: true,
    ignore: ['**/node_modules/**'],
  });

  const formatConfig = await getCodeFormatOptions();

  for (const entry of entries) {
    if (entry.endsWith('.d.ts')) {
      if (!keepTypes) await removeFile(entry);

      continue;
    }

    const tsx = await readFile(entry);
    const mjs = await formatCode(
      await transpileFile(tsx, entry, keepTypes),
      formatConfig,
    );

    await removeFile(entry);
    await writeFile(entry.replace(/\.ts(x?)$/, '.js$1'), mjs);
  }

  // Change extensions in remix.config.js
  try {
    const remixConfigPath = joinPath(projectDir, 'remix.config.js');
    let remixConfig = await readFile(remixConfigPath);

    remixConfig = remixConfig.replace(/\/server\.ts/gim, '/server.js');

    await writeFile(remixConfigPath, remixConfig);
  } catch (error) {
    outputDebug(
      'Could not change TS extensions in remix.config.js:\n' +
        (error as Error).stack,
    );
  }

  // Transpile tsconfig.json to jsconfig.json
  try {
    const tsConfigPath = joinPath(projectDir, 'tsconfig.json');
    const tsConfigWithComments = await readFile(tsConfigPath);
    const jsConfig = convertConfigToJS(
      JSON.parse(tsConfigWithComments.replace(/^\s*\/\/.*$/gm, '')),
      keepTypes,
    );

    await removeFile(tsConfigPath);
    await writeFile(
      joinPath(projectDir, 'jsconfig.json'),
      JSON.stringify(jsConfig, null, 2),
    );
  } catch (error) {
    outputDebug(
      'Could not transpile tsconfig.json:\n' + (error as Error).stack,
    );
  }

  // Remove some TS dependencies
  try {
    const pkgJson = JSON.parse(
      await readFile(joinPath(projectDir, 'package.json')),
    );

    delete pkgJson.scripts['typecheck'];
    if (!keepTypes) {
      delete pkgJson.devDependencies['typescript'];
      delete pkgJson.devDependencies['@shopify/oxygen-workers-types'];

      for (const key of Object.keys(pkgJson.devDependencies)) {
        if (key.startsWith('@types/')) {
          delete pkgJson.devDependencies[key];
        }
      }

      const codegenFlag = /\s*--codegen/;
      if (pkgJson.scripts?.dev) {
        pkgJson.scripts.dev = pkgJson.scripts.dev.replace(codegenFlag, '');
      }
      if (pkgJson.scripts?.build) {
        pkgJson.scripts.build = pkgJson.scripts.build.replace(codegenFlag, '');
      }
    }

    await writeFile(
      joinPath(projectDir, 'package.json'),
      JSON.stringify(pkgJson, null, 2),
    );
  } catch (error) {
    outputDebug(
      'Could not remove TS dependencies from package.json:\n' +
        (error as Error).stack,
    );
  }

  // Remove TS from ESLint
  try {
    const {filepath = joinPath(projectDir, '.eslintrc.cjs')} =
      await findFileWithExtension(projectDir, '.eslintrc', ['cjs', 'js']);

    let eslintrc = await readFile(filepath);

    if (!keepTypes) {
      eslintrc = eslintrc.replace(/\/\*\*[\s*]+@type.+\s+\*\/\s?/gim, '');
    }

    eslintrc = eslintrc
      .replace(/\s*,?\s*['"`]plugin:hydrogen\/typescript['"`]/gim, '')
      .replace(/\s+['"`]@typescript-eslint\/.+,/gim, '');

    await writeFile(filepath, await formatCode(eslintrc, formatConfig));
  } catch (error) {
    outputDebug(
      'Could not remove TS rules from .eslintrc:\n' + (error as Error).stack,
    );
  }
}
