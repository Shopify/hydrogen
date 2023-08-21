import {AbortError} from '@shopify/cli-kit/node/error';
import {type FormatOptions} from '../../format-code.js';
import {findFileWithExtension, replaceFileContent} from '../../file.js';
import {importLangAstGrep, type SgNode} from '../../ast.js';

/**
 * Adds new properties to the Remix config file.
 * @param rootDirectory Remix root directory
 * @param formatConfig Prettier formatting options
 * @returns
 */
export async function replaceRemixConfig(
  rootDirectory: string,
  formatConfig: FormatOptions,
  newProperties: Record<string, any>,
) {
  const {filepath, astType} = await findFileWithExtension(
    rootDirectory,
    'remix.config',
  );

  if (!filepath || !astType) {
    throw new AbortError(
      `Could not find remix.config.js file in ${rootDirectory}`,
    );
  }

  await replaceFileContent(filepath, formatConfig, async (content) => {
    const astGrep = await importLangAstGrep(astType);
    const root = astGrep.parse(content).root();

    const remixConfigNode = root.find({
      rule: {
        kind: 'object',
        inside: {
          any: [
            {
              kind: 'export_statement', // ESM
            },
            {
              kind: 'assignment_expression', // CJS
              has: {
                kind: 'member_expression',
                field: 'left',
                pattern: 'module.exports',
              },
            },
          ],
        },
      },
    });

    if (!remixConfigNode) {
      throw new AbortError(
        'Could not find a default export in remix.config.js',
      );
    }

    newProperties = {...newProperties};
    for (const key of Object.keys(newProperties)) {
      const propertyNode = remixConfigNode.find({
        rule: {
          kind: 'pair',
          has: {
            field: 'key',
            regex: `^${key}$`,
          },
        },
      });

      // Already installed?
      if (
        propertyNode?.text().endsWith(' ' + JSON.stringify(newProperties[key]))
      ) {
        delete newProperties[key];
      }
    }

    if (Object.keys(newProperties).length === 0) {
      // Nothign to change
      return;
    }

    const childrenNodes = remixConfigNode.children();

    // Place properties before `future` prop or at the end of the object.
    const lastNode: SgNode | undefined =
      childrenNodes.find((node) => node.text().startsWith('future:')) ??
      childrenNodes.pop();

    if (!lastNode) {
      throw new AbortError('Could not add properties to Remix config');
    }

    const {start} = lastNode.range();
    return (
      content.slice(0, start.index) +
      JSON.stringify(newProperties).slice(1, -1) +
      ',' +
      content.slice(start.index)
    );
  });
}

/**
 * Adds a new CSS file import to the root file and returns it from the `links` export.
 * @param appDirectory Remix app directory
 * @param formatConfig Prettier formatting options
 * @param importer Tuple of import name and import path
 */
export async function replaceRootLinks(
  appDirectory: string,
  formatConfig: FormatOptions,
  importer: {
    name: string;
    path: string;
    isDefault: boolean;
    isConditional?: boolean;
    isAbsolute?: boolean;
  },
) {
  const {filepath, astType} = await findFileWithExtension(appDirectory, 'root');

  if (!filepath || !astType) {
    throw new AbortError(`Could not find root file in ${appDirectory}`);
  }

  await replaceFileContent(filepath, formatConfig, async (content) => {
    const importStatement = `import ${
      importer.isDefault ? importer.name : `{${importer.name}}`
    } from '${(importer.isAbsolute ? '' : './') + importer.path}';`;

    if (content.includes(importStatement.split('from')[0]!)) {
      return; // Already installed
    }

    const astGrep = await importLangAstGrep(astType);
    const root = astGrep.parse(content).root();

    const lastImportNode = root
      .findAll({rule: {kind: 'import_statement'}})
      .pop();

    const linksReturnNode = root.find({
      utils: {
        'has-links-id': {
          has: {
            kind: 'identifier',
            pattern: 'links',
          },
        },
      },
      rule: {
        kind: 'return_statement',
        pattern: 'return [$$$]',
        inside: {
          any: [
            {
              kind: 'function_declaration',
              matches: 'has-links-id',
            },
            {
              kind: 'variable_declarator',
              matches: 'has-links-id',
            },
          ],
          stopBy: 'end',
          inside: {
            stopBy: 'end',
            kind: 'export_statement',
          },
        },
      },
    });

    if (!lastImportNode || !linksReturnNode) {
      throw new AbortError(
        'Could not find a "links" export in root file. Please add one and try again.',
      );
    }

    const lastImportContent = lastImportNode.text();
    const linksExportReturnContent = linksReturnNode.text();
    const newLinkReturnItem = importer.isConditional
      ? `...(${importer.name} ? [{ rel: 'stylesheet', href: ${importer.name} }] : [])`
      : `{rel: 'stylesheet', href: ${importer.name}}`;

    return content
      .replace(lastImportContent, lastImportContent + '\n' + importStatement)
      .replace(
        linksExportReturnContent,
        linksExportReturnContent.replace('[', `[${newLinkReturnItem},`),
      );
  });
}

export function injectCssBundlingLink(
  appDirectory: string,
  formatConfig: FormatOptions,
) {
  return replaceRootLinks(appDirectory, formatConfig, {
    name: 'cssBundleHref',
    path: '@remix-run/css-bundle',
    isDefault: false,
    isConditional: true,
    isAbsolute: true,
  });
}
