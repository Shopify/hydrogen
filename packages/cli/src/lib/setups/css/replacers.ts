import {type FormatOptions} from '../../format-code.js';
import {findFileWithExtension, replaceFileContent} from '../../file.js';
import {ts, tsx, js, jsx, type SgNode} from '@ast-grep/napi';

const astGrep = {ts, tsx, js, jsx};

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
    // TODO throw
    return;
  }

  await replaceFileContent(filepath, formatConfig, async (content) => {
    const root = astGrep[astType].parse(content).root();

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
      // TODO
      return;
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
      // TODO throw?
      return null;
    }

    const childrenNodes = remixConfigNode.children();

    // Place properties before `future` prop or at the end of the object.
    const lastNode: SgNode | undefined =
      // @ts-ignore -- We need TS5 to use `findLast`
      childrenNodes.findLast((node) => node.text().startsWith('future:')) ??
      childrenNodes.pop();

    if (!lastNode) {
      // TODO
      return;
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
  importer: [string, string],
) {
  const {filepath, astType} = await findFileWithExtension(appDirectory, 'root');

  if (!filepath || !astType) {
    // TODO throw
    return;
  }

  await replaceFileContent(filepath, formatConfig, async (content) => {
    const tailwindImport = `import ${importer[0]} from './${importer[1]}';`;
    if (content.includes(tailwindImport.split('from')[0]!)) {
      return null;
    }

    const root = astGrep[astType].parse(content).root();

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
      return content;
    }

    const lastImportContent = lastImportNode.text();
    const linksExportReturnContent = linksReturnNode.text();
    return content
      .replace(lastImportContent, lastImportContent + '\n' + tailwindImport)
      .replace(
        linksExportReturnContent,
        linksExportReturnContent.replace(
          '[',
          `[{rel: 'stylesheet', href: ${importer[0]}},`,
        ),
      );
  });
}
