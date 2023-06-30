import {AbortError} from '@shopify/cli-kit/node/error';
import {joinPath, relativePath} from '@shopify/cli-kit/node/path';
import {fileExists} from '@shopify/cli-kit/node/fs';
import {ts, tsx, js, jsx} from '@ast-grep/napi';
import {findFileWithExtension, replaceFileContent} from '../../file.js';
import type {FormatOptions} from '../../format-code.js';
import type {I18nSetupConfig} from './index.js';

const astGrep = {ts, tsx, js, jsx};

/**
 * Adds the `getLocaleFromRequest` function to the server entrypoint and calls it.
 */
export async function replaceServerI18n(
  {rootDirectory, serverEntryPoint = 'server'}: I18nSetupConfig,
  formatConfig: FormatOptions,
  localeExtractImplementation: string,
) {
  const {filepath, astType} = await findEntryFile({
    rootDirectory,
    serverEntryPoint,
  });

  await replaceFileContent(filepath, formatConfig, async (content) => {
    const root = astGrep[astType].parse(content).root();

    // First parameter of the `fetch` function.
    // Normally it's called `request`, but it could be renamed.
    const requestIdentifier = root.find({
      rule: {
        kind: 'identifier',
        inside: {
          kind: 'formal_parameters',
          stopBy: 'end',
          inside: {
            kind: 'method_definition',
            stopBy: 'end',
            has: {
              kind: 'property_identifier',
              regex: '^fetch$',
            },
            inside: {
              kind: 'export_statement',
              stopBy: 'end',
            },
          },
        },
      },
    });

    const requestIdentifierName = requestIdentifier?.text() ?? 'request';
    const i18nFunctionName = localeExtractImplementation.match(
      /^(export )?function (\w+)/m,
    )?.[2];

    if (!i18nFunctionName) {
      throw new Error('Could not find the i18n function name');
    }

    const i18nFunctionCall = `${i18nFunctionName}(${requestIdentifierName})`;

    const hydrogenImportPath = '@shopify/hydrogen';
    const hydrogenImportName = 'createStorefrontClient';

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
        `Could not find a Hydrogen import in ${serverEntryPoint}`,
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
        `Could not find a Hydrogen client instantiation with an inline object as argument in ${serverEntryPoint}`,
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

    const importTypes = localeExtractImplementation.match(
      /import\s+type\s+[^;]+?;/,
    )?.[0];

    if (importTypes) {
      localeExtractImplementation = localeExtractImplementation.replace(
        importTypes,
        '',
      );

      const lastImportNode = root
        .findAll({rule: {kind: 'import_statement'}})
        .pop();

      if (lastImportNode) {
        const lastImportContent = lastImportNode.text();
        content = content.replace(
          lastImportContent,
          lastImportContent +
            '\n' +
            importTypes.replace(
              /'[^']+'/,
              `'@shopify/hydrogen/storefront-api-types'`,
            ),
        );
      }
    }

    return (
      content +
      `\n\n${localeExtractImplementation
        .replace(/^export function/m, 'function')
        .replace(/^export {.*?;/m, '')}\n`
    );
  });
}

/**
 * Adds I18nLocale import and pass it to Storefront<I18nLocale> type as generic in `remix.env.d.ts`
 */
export async function replaceRemixEnv(
  {rootDirectory, serverEntryPoint}: I18nSetupConfig,
  formatConfig: FormatOptions,
  localeExtractImplementation: string,
) {
  const remixEnvPath = joinPath(rootDirectory, 'remix.env.d.ts');

  if (!(await fileExists(remixEnvPath))) {
    return; // Skip silently
  }

  const i18nTypeName =
    localeExtractImplementation.match(/export type (\w+)/)?.[1];

  if (!i18nTypeName) {
    // JavaScript project
    return; // Skip silently
    // TODO: support d.ts files in JS
  }

  const {filepath: entryFilepath} = await findEntryFile({
    rootDirectory,
    serverEntryPoint,
  });

  const relativePathToEntry = relativePath(
    rootDirectory,
    entryFilepath,
  ).replace(/.[tj]sx?$/, '');

  await replaceFileContent(remixEnvPath, formatConfig, (content) => {
    if (content.includes(`Storefront<`)) return; // Already set up

    const root = astGrep.ts.parse(content).root();

    const storefrontTypeNode = root.find({
      rule: {
        kind: 'property_signature',
        has: {
          kind: 'type_annotation',
          has: {
            regex: '^Storefront$',
          },
        },
        inside: {
          kind: 'interface_declaration',
          stopBy: 'end',
          regex: 'AppLoadContext',
        },
      },
    });

    if (!storefrontTypeNode) {
      return; // Skip silently
    }

    // Replace this first to avoid changing indexes in code below
    const {end} = storefrontTypeNode.range();
    content =
      content.slice(0, end.index) +
      `<${i18nTypeName}>` +
      content.slice(end.index);

    const serverImportNode = root
      .findAll({
        rule: {
          kind: 'import_statement',
          has: {
            kind: 'string_fragment',
            stopBy: 'end',
            regex: `^(\\./)?${relativePathToEntry.replaceAll(
              '.',
              '\\.',
            )}(\\.[jt]sx?)?$`,
          },
        },
      })
      .pop();

    if (serverImportNode) {
      content = content.replace(
        serverImportNode.text(),
        serverImportNode.text().replace('{', `{${i18nTypeName},`),
      );
    } else {
      const lastImportNode =
        root.findAll({rule: {kind: 'import_statement'}}).pop() ??
        root.findAll({rule: {kind: 'comment', regex: '^/// <reference'}}).pop();

      const {end} = lastImportNode?.range() ?? {end: {index: 0}};

      const typeImport = `\nimport type {${i18nTypeName}} from './${serverEntryPoint!.replace(
        /\.[jt]s$/,
        '',
      )}';`;

      content =
        content.slice(0, end.index) + typeImport + content.slice(end.index);
    }

    return content;
  });
}

async function findEntryFile({
  rootDirectory,
  serverEntryPoint = 'server',
}: I18nSetupConfig) {
  const match = serverEntryPoint.match(/\.([jt]sx?)$/)?.[1] as
    | 'ts'
    | 'tsx'
    | 'js'
    | 'jsx'
    | undefined;

  const {filepath, astType} = match
    ? {filepath: joinPath(rootDirectory, serverEntryPoint), astType: match}
    : await findFileWithExtension(rootDirectory, serverEntryPoint);

  if (!filepath || !astType) {
    throw new AbortError(
      `Could not find a server entry point at ${serverEntryPoint}`,
    );
  }

  return {filepath, astType};
}
