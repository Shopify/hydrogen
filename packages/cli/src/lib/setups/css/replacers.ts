import {AbortError} from '@shopify/cli-kit/node/error';
import {type FormatOptions} from '../../format-code.js';
import {findFileWithExtension, replaceFileContent} from '../../file.js';
import {importLangAstGrep, type SgNode} from '../../ast.js';

/**
 * Adds a new CSS file import to the root file and returns it from the `links` export.
 * @param appDirectory Remix app directory
 * @param formatConfig Prettier formatting options
 * @param importer Object describing the import statement and its usage
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

    const importNodes = root.findAll({rule: {kind: 'import_statement'}});
    const lastImportNode =
      importNodes.findLast((node) => node.text().includes('.css')) ||
      importNodes.pop();

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

/**
 * Adds a new CSS file import to the root file and returns it from the `links` export.
 * @param rootDirectory Root directory
 * @param formatConfig Prettier formatting options
 * @param importer Tuple of import name and import path
 */
export async function injectVitePlugin(
  rootDirectory: string,
  formatConfig: FormatOptions,
  importer: {
    name: string;
    path: string;
    isDefault: boolean;
  },
  pluginOptions?: Record<string, any>,
) {
  const {filepath, astType} = await findFileWithExtension(
    rootDirectory,
    'vite.config',
  );

  if (!filepath || !astType) {
    throw new AbortError(`Could not find vite.config file in ${rootDirectory}`);
  }

  await replaceFileContent(filepath, formatConfig, async (content) => {
    const importStatement = `import ${
      importer.isDefault ? importer.name : `{${importer.name}}`
    } from '${importer.path}';`;

    if (
      new RegExp(`['"]${importer.path.replace('/', '\\/')}['"]`).test(content)
    ) {
      return; // Already installed
    }

    const astGrep = await importLangAstGrep(astType);
    const root = astGrep.parse(content).root();

    const lastImportNode = root
      .findAll({rule: {kind: 'import_statement'}})
      .pop();

    const vitePluginListNode = root.find(vitePluginListRule);

    if (!lastImportNode || !vitePluginListNode) {
      throw new AbortError(
        'Could not find a "plugins" key in Vite config file. Please add one and try again.',
      );
    }

    const lastImportContent = lastImportNode.text();
    const linksExportReturnContent = vitePluginListNode.text();
    const newVitePluginItem = `${importer.name}(${
      pluginOptions ? JSON.stringify(pluginOptions) : ''
    })`;

    return content
      .replace(lastImportContent, lastImportContent + '\n' + importStatement)
      .replace(
        linksExportReturnContent,
        linksExportReturnContent.replace('[', `[${newVitePluginItem},`),
      );
  });
}

const vitePluginListRule = {
  rule: {
    // An array
    pattern: '[$$$]',
    inside: {
      // directly in the value part of a `plugins` key
      kind: 'pair',
      stopBy: 'neighbor',
      has: {
        field: 'key',
        regex: '^plugins$',
        stopBy: 'neighbor',
      },
      inside: {
        // directly inside an object (the Vite config object)
        kind: 'object',
        stopBy: 'neighbor',
        // that is exported but is not inside another object
        // e.g. `export default {something:{plugins:[]}}`
        // doesn't match, but `export default {plugins:[]}` does.
        // And `export default defineConfig({plugins:[]})` matches too.
        all: [
          {
            inside: {
              kind: 'export_statement',
              regex: 'export default',
              stopBy: 'end',
            },
          },
          {
            not: {
              inside: {
                kind: 'object',
                stopBy: 'end',
              },
            },
          },
        ],
      },
    },
  },
};
