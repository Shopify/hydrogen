import {AbortError} from '@shopify/cli-kit/node/error';
import {joinPath} from '@shopify/cli-kit/node/path';
import {ts, tsx, js, jsx} from '@ast-grep/napi';
import {findFileWithExtension, replaceFileContent} from '../../file.js';
import type {FormatOptions} from '../../format-code.js';
import type {SetupConfig} from './index.js';

const astGrep = {ts, tsx, js, jsx};

export async function replaceServerI18n(
  {rootDirectory, serverEntryPoint = 'server'}: SetupConfig,
  formatConfig: FormatOptions,
  localeExtractImplementation: (isTs: boolean) => string,
) {
  const match = serverEntryPoint.match(/\.([jt]sx?)$/)?.[1] as
    | 'ts'
    | 'tsx'
    | 'js'
    | 'jsx'
    | undefined;

  const {filepath, astType} = match
    ? {filepath: joinPath(rootDirectory, serverEntryPoint), astType: match}
    : await findFileWithExtension(rootDirectory, serverEntryPoint);

  const isTs = astType === 'ts' || astType === 'tsx';

  if (!filepath || !astType) {
    throw new AbortError(
      `Could not find a server entry point at ${serverEntryPoint}`,
    );
  }

  await replaceFileContent(filepath, formatConfig, async (content) => {
    const root = astGrep[astType].parse(content).root();

    // First parameter of the `fetch` function.
    // Normally it's called `request`, but it could be renamed.
    const requestIdentifier = root.find({
      rule: {
        kind: 'identifier',
        inside: {
          kind: 'required_parameter',
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
    const i18nFunctionName = 'getLocaleFromRequest';
    const i18nFunctionCall = `${i18nFunctionName}(${requestIdentifierName}.url)`;

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

    if (isTs) {
      const lastImportNode = root
        .findAll({rule: {kind: 'import_statement'}})
        .pop();

      if (lastImportNode) {
        const lastImportContent = lastImportNode.text();
        content = content.replace(
          lastImportContent,
          lastImportContent +
            `\nimport type {LanguageCode, CountryCode} from '@shopify/hydrogen/storefront-api-types';`,
        );
      }
    }

    const localeExtractorFn = localeExtractImplementation(isTs).replace(
      /function \w+\(/,
      `function ${i18nFunctionName}(`,
    );

    return content + `\n\n${localeExtractorFn}\n`;
  });
}
