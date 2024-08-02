import {AbortError} from '@shopify/cli-kit/node/error';
import {
  joinPath,
  resolvePath,
  dirname,
  relativePath,
  extname,
} from '@shopify/cli-kit/node/path';
import {fileExists, copyFile, readFile} from '@shopify/cli-kit/node/fs';
import {findFileWithExtension, replaceFileContent} from '../../file.js';
import type {FormatOptions} from '../../format-code.js';
import type {I18nSetupConfig} from './index.js';
import {importLangAstGrep} from '../../ast.js';
import {transpileFile} from '../../transpile/index.js';

/**
 * Adds the `getLocaleFromRequest` function to createAppLoadContext method and calls it.
 */
export async function replaceContextI18n(
  {
    rootDirectory,
    contextCreate = joinPath('app', 'lib', 'context.ts'),
  }: I18nSetupConfig,
  formatConfig: FormatOptions,
  i18nStrategyFilePath: string,
) {
  const createContextMethodName = 'createAppLoadContext';
  const {filepath, astType} = await findContextCreateFile({
    rootDirectory,
    contextCreate,
  });

  const localeExtractImpl = await readFile(i18nStrategyFilePath);

  const i18nFileFinalPath = await replaceI18nStrategy(
    {rootDirectory, contextCreate},
    formatConfig,
    i18nStrategyFilePath,
  );

  await replaceFileContent(filepath, formatConfig, async (content) => {
    const astGrep = await importLangAstGrep(astType);
    const root = astGrep.parse(content).root();

    // -- Find all the places that need replacement in the context create file

    // Build i18n function call using request name (1st parameter of the `createAppLoadContext` function)
    // and i18n function name from i18nStrategyFilePath file content
    const requestIdentifier = root.find({
      rule: {
        kind: 'identifier',
        inside: {
          kind: 'formal_parameters',
          stopBy: 'end',
          inside: {
            kind: 'function_declaration',
            stopBy: 'end',
            has: {
              kind: 'identifier',
              regex: `^${createContextMethodName}$`,
            },
          },
        },
      },
    });

    const requestIdentifierName = requestIdentifier?.text() ?? 'request';
    const i18nFunctionName = localeExtractImpl.match(
      /^(export )?function (\w+)/m,
    )?.[2];

    if (!i18nFunctionName) {
      throw new Error('Could not find the i18n function name');
    }

    const i18nFunctionCall = `${i18nFunctionName}(${requestIdentifierName})`;

    const hydrogenImportPath = '@shopify/hydrogen';
    const hydrogenImportName = 'createHydrogenContext';

    // -- Replace content in reversed order (bottom => top) to avoid changing string indexes

    // 1. Replace i18n option in createHydrogenContext() with i18n function call

    // Find the import statement for Hydrogen
    const importSpecifier = root.find({
      rule: {
        kind: 'import_specifier',
        inside: {
          kind: 'import_statement',
          stopBy: 'end',
          has: {
            kind: 'string_fragment',
            stopBy: 'end',
            regex: `^${hydrogenImportPath}$`,
          },
        },
        has: {
          kind: 'identifier',
          regex: `^${hydrogenImportName}`, // could be appended with " as ..."
        },
      },
    });

    let [importName, importAlias] =
      importSpecifier?.text().split(/\s+as\s+/) || [];

    importName = importAlias ?? importName;

    if (!importName) {
      throw new AbortError(
        `Could not find a Hydrogen import in ${contextCreate}`,
        `Please import "${hydrogenImportName}" from "${hydrogenImportPath}"`,
      );
    }

    // Find the argument of the Hydrogen client instantiation
    const argumentObject = root.find({
      rule: {
        kind: 'object',
        inside: {
          kind: 'arguments',
          inside: {
            kind: 'call_expression',
            has: {
              kind: 'identifier',
              regex: importName,
            },
          },
        },
      },
    });

    if (!argumentObject) {
      throw new AbortError(
        `Could not find a Hydrogen client instantiation with an inline object as argument in ${contextCreate}`,
        `Please add a call to ${importName}({...})`,
      );
    }

    const i18nProperty = argumentObject.find({
      rule: {
        kind: 'property_identifier',
        regex: '^i18n$',
      },
    });

    // [property, :, value]
    const i18nValue = i18nProperty?.next()?.next();

    // Has default or existing property
    if (i18nValue) {
      if (i18nValue.text().includes(i18nFunctionName)) {
        throw new AbortError(
          'An i18n strategy is already set up.',
          `Remove the existing i18n property in the ${importName}({...}) call to set up a new one.`,
        );
      }

      const {start, end} = i18nValue.range();
      content =
        content.slice(0, start.index) +
        i18nFunctionCall +
        content.slice(end.index);
    } else {
      const {end} = argumentObject.range();
      const firstPart = content.slice(0, end.index - 1);
      content =
        firstPart +
        ((/,\s*$/.test(firstPart) ? '' : ',') + `i18n: ${i18nFunctionCall}`) +
        content.slice(end.index - 1);
    }

    // 2. Add i18n file import
    const lastImport = root.findAll({rule: {kind: 'import_statement'}}).pop();
    const lastImportRange = lastImport?.range() ?? {
      end: {index: 0},
    };

    const i18nFunctionImport = joinPath(
      '~',
      relativePath(
        joinPath(rootDirectory, 'app'),
        i18nFileFinalPath.slice(0, -extname(i18nFileFinalPath).length),
      ),
    );

    content =
      content.slice(0, lastImportRange.end.index) +
      `import {getLocaleFromRequest} from "${i18nFunctionImport}";` +
      content.slice(lastImportRange.end.index);

    return content;
  });
}

/**
 * Adds I18nLocale file and update the i18n type import
 */
async function replaceI18nStrategy(
  {
    rootDirectory,
    contextCreate = joinPath('app', 'lib', 'context.ts'),
  }: I18nSetupConfig,
  formatConfig: FormatOptions,
  i18nStrategyFilePath: string,
) {
  const isJs = contextCreate?.endsWith('.js') || false;

  const i18nPath = joinPath(
    rootDirectory,
    dirname(contextCreate),
    isJs ? 'i18n.js' : 'i18n.ts',
  );

  if (await fileExists(i18nPath)) {
    throw new AbortError(
      `${i18nPath} already exist. Renamed or remove the existing file before continue.`,
    );
  }

  await copyFile(i18nStrategyFilePath, i18nPath);

  await replaceFileContent(i18nPath, formatConfig, async (content) => {
    content = content.replace(/\.\/mock-i18n-types\.js/, '@shopify/hydrogen');

    if (isJs) {
      // transpileFile to js file
      content = await transpileFile(content, i18nStrategyFilePath);
    }

    return content;
  });

  return i18nPath;
}

async function findContextCreateFile({
  rootDirectory,
  contextCreate = joinPath('app', 'lib', 'context.ts'),
}: I18nSetupConfig) {
  const match = contextCreate.match(/\.([jt]sx?)$/)?.[1] as
    | 'ts'
    | 'tsx'
    | 'js'
    | 'jsx'
    | undefined;

  const {filepath, astType} = match
    ? {filepath: resolvePath(rootDirectory, contextCreate), astType: match}
    : await findFileWithExtension(rootDirectory, joinPath(contextCreate));

  if (!filepath || !astType) {
    throw new AbortError(
      `Could not find a context create file at ${resolvePath(
        rootDirectory,
        contextCreate,
      )}`,
    );
  }

  return {filepath, astType};
}
