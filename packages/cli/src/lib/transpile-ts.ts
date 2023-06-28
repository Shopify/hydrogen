import path from 'path';
import fs from 'fs/promises';
import prettier, {type Options as FormatOptions} from 'prettier';
import ts, {type CompilerOptions} from 'typescript';
import glob from 'fast-glob';
import {outputDebug} from '@shopify/cli-kit/node/output';

const escapeNewLines = (code: string) =>
  code.replace(/\n\n/g, '\n/* :newline: */');
const restoreNewLines = (code: string) =>
  code.replace(/\/\* :newline: \*\//g, '\n');

const DEFAULT_TS_CONFIG: Omit<CompilerOptions, 'target'> = {
  lib: ['DOM', 'DOM.Iterable', 'ES2022'],
  isolatedModules: true,
  esModuleInterop: true,
  resolveJsonModule: true,
  target: 'ES2022',
  strict: true,
  allowJs: true,
  forceConsistentCasingInFileNames: true,
  skipLibCheck: true,
};

export function transpileFile(code: string, config = DEFAULT_TS_CONFIG) {
  // We need to escape new lines in the template because TypeScript
  // will remove them when compiling.
  const withArtificialNewLines = escapeNewLines(code);

  // We compile the template to JavaScript.
  const compiled = ts.transpileModule(withArtificialNewLines, {
    reportDiagnostics: false,
    compilerOptions: {
      ...config,
      // '1' tells TypeScript to preserve the JSX syntax.
      jsx: 1,
      removeComments: false,
    },
  });

  // Here we restore the new lines that were removed by TypeScript.
  return restoreNewLines(compiled.outputText);
}

const DEFAULT_PRETTIER_CONFIG: FormatOptions = {
  arrowParens: 'always',
  singleQuote: true,
  bracketSpacing: false,
  trailingComma: 'all',
};

export async function resolveFormatConfig(filePath = process.cwd()) {
  try {
    // Try to read a prettier config file from the project.
    return (await prettier.resolveConfig(filePath)) || DEFAULT_PRETTIER_CONFIG;
  } catch {
    return DEFAULT_PRETTIER_CONFIG;
  }
}

export function format(content: string, config: FormatOptions, filePath = '') {
  const ext = path.extname(filePath);

  const formattedContent = prettier.format(content, {
    // Specify the TypeScript parser for ts/tsx files. Otherwise
    // we need to use the babel parser because the default parser
    // Otherwise prettier will print a warning.
    parser: ext === '.tsx' || ext === '.ts' ? 'typescript' : 'babel',
    ...config,
  });

  return formattedContent;
}

const DEFAULT_JS_CONFIG: Omit<CompilerOptions, 'jsx'> = {
  allowJs: true,
  forceConsistentCasingInFileNames: true,
  strict: true,
  lib: ['DOM', 'DOM.Iterable', 'ES2022'],
  esModuleInterop: true,
  isolatedModules: true,
  jsx: 'react-jsx',
  noEmit: true,
  resolveJsonModule: true,
};

// https://code.visualstudio.com/docs/languages/jsconfig#_jsconfig-options
const JS_CONFIG_KEYS = [
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
];

export function convertConfigToJS(tsConfig: {
  include?: string[];
  compilerOptions?: CompilerOptions;
}) {
  const jsConfig = {
    compilerOptions: {...DEFAULT_JS_CONFIG},
  } as typeof tsConfig;

  if (tsConfig.include) {
    jsConfig.include = tsConfig.include
      .filter((s) => !s.endsWith('.d.ts'))
      .map((s) => s.replace(/\.ts(x?)$/, '.js$1'));
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

export async function transpileProject(projectDir: string) {
  const entries = await glob('**/*.+(ts|tsx)', {
    absolute: true,
    cwd: projectDir,
  });

  const formatConfig = await resolveFormatConfig();

  for (const entry of entries) {
    if (entry.endsWith('.d.ts')) {
      await fs.rm(entry);
      continue;
    }

    const tsx = await fs.readFile(entry, 'utf8');
    const mjs = format(transpileFile(tsx), formatConfig);

    await fs.rm(entry);
    await fs.writeFile(entry.replace(/\.ts(x?)$/, '.js$1'), mjs, 'utf8');
  }

  // Change extensions in remix.config.js
  try {
    const remixConfigPath = path.join(projectDir, 'remix.config.js');
    let remixConfig = await fs.readFile(remixConfigPath, 'utf8');

    remixConfig = remixConfig.replace(/\/server\.ts/gim, '/server.js');

    await fs.writeFile(remixConfigPath, remixConfig);
  } catch (error) {
    outputDebug(
      'Could not change TS extensions in remix.config.js:\n' +
        (error as Error).stack,
    );
  }

  // Transpile tsconfig.json to jsconfig.json
  try {
    const tsConfigPath = path.join(projectDir, 'tsconfig.json');
    const tsConfigWithComments = await fs.readFile(tsConfigPath, 'utf8');
    const jsConfig = convertConfigToJS(
      JSON.parse(tsConfigWithComments.replace(/^\s*\/\/.*$/gm, '')),
    );

    await fs.rm(tsConfigPath);
    await fs.writeFile(
      path.join(projectDir, 'jsconfig.json'),
      JSON.stringify(jsConfig, null, 2),
      'utf8',
    );
  } catch (error) {
    outputDebug(
      'Could not transpile tsconfig.json:\n' + (error as Error).stack,
    );
  }

  // Remove some TS dependencies
  try {
    const pkgJson = JSON.parse(
      await fs.readFile(path.join(projectDir, 'package.json'), 'utf8'),
    );

    delete pkgJson.scripts['typecheck'];
    delete pkgJson.devDependencies['typescript'];
    delete pkgJson.devDependencies['@shopify/oxygen-workers-types'];

    for (const key of Object.keys(pkgJson.devDependencies)) {
      if (key.startsWith('@types/')) {
        delete pkgJson.devDependencies[key];
      }
    }

    const codegenFlag = /\s*--codegen(-unstable)?/;
    if (pkgJson.scripts?.dev) {
      pkgJson.scripts.dev = pkgJson.scripts.dev.replace(codegenFlag, '');
    }
    if (pkgJson.scripts?.build) {
      pkgJson.scripts.build = pkgJson.scripts.build.replace(codegenFlag, '');
    }

    await fs.writeFile(
      path.join(projectDir, 'package.json'),
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
    const eslintrcPath = path.join(projectDir, '.eslintrc.js');
    let eslintrc = await fs.readFile(eslintrcPath, 'utf8');

    eslintrc = eslintrc
      .replace(/\/\*\*[\s*]+@type.+\s+\*\/\s?/gim, '')
      .replace(/\s*,?\s*['"`]plugin:hydrogen\/typescript['"`]/gim, '')
      .replace(/\s+['"`]@typescript-eslint\/.+,/gim, '');

    await fs.writeFile(eslintrcPath, eslintrc);
  } catch (error) {
    outputDebug(
      'Could not remove TS rules from .eslintrc:\n' + (error as Error).stack,
    );
  }
}
