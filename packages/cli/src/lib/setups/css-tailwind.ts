import type {RemixConfig} from '@remix-run/dev/dist/config.js';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {joinPath, relativePath} from '@shopify/cli-kit/node/path';
import {canWriteFiles, copyAssets, mergePackageJson} from '../assets.js';
import {getCodeFormatOptions, type FormatOptions} from '../format-code.js';
import {ts, tsx, js, jsx, type SgNode} from '@ast-grep/napi';
import {findFileWithExtension, replaceFileContent} from '../file.js';

const astGrep = {ts, tsx, js, jsx};

const tailwindCssPath = 'styles/tailwind.css';

export type SetupResult = {
  workPromise: Promise<unknown>;
  generatedAssets: string[];
  helpUrl: string;
};

export async function setupTailwind({
  remixConfig,
  force = false,
}: {
  remixConfig: RemixConfig;
  force?: boolean;
}): Promise<undefined | SetupResult> {
  const {rootDirectory, appDirectory} = remixConfig;

  const relativeAppDirectory = relativePath(rootDirectory, appDirectory);

  const assetMap = {
    'tailwind.config.js': 'tailwind.config.js',
    'postcss.config.js': 'postcss.config.js',
    'tailwind.css': joinPath(relativeAppDirectory, tailwindCssPath),
  } as const;

  // @ts-expect-error Only available in Remix 1.16+
  if (remixConfig.tailwind && remixConfig.postcss) {
    outputInfo(`Tailwind and PostCSS are already setup in ${rootDirectory}.`);
    return;
  }

  if (!(await canWriteFiles(assetMap, appDirectory, force))) {
    outputInfo(
      `Skipping CSS setup as some files already exist. You may use \`--force\` or \`-f\` to override it.`,
    );

    return;
  }

  const workPromise = Promise.all([
    mergePackageJson('tailwind', rootDirectory),
    copyAssets('tailwind', assetMap, rootDirectory, (content, filepath) =>
      filepath === 'tailwind.config.js'
        ? content.replace('{src-dir}', relativeAppDirectory)
        : content,
    ),
    getCodeFormatOptions(rootDirectory).then((formatConfig) =>
      Promise.all([
        replaceRemixConfig(rootDirectory, formatConfig),
        replaceLinksFunction(appDirectory, formatConfig),
      ]),
    ),
  ]);

  return {
    workPromise,
    generatedAssets: Object.values(assetMap),
    helpUrl: 'https://tailwindcss.com/docs/configuration',
  };
}

async function replaceRemixConfig(
  rootDirectory: string,
  formatConfig: FormatOptions,
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

    const tailwindPropertyNode = remixConfigNode.find({
      rule: {
        kind: 'pair',
        has: {
          field: 'key',
          regex: '^tailwind$',
        },
      },
    });

    // Already has tailwind installed
    if (tailwindPropertyNode?.text().endsWith(' true')) {
      // TODO throw
      return;
    }

    const childrenNodes = remixConfigNode.children();

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
      'tailwind: true, postcss: true,' +
      content.slice(start.index)
    );
  });
}

async function replaceLinksFunction(
  appDirectory: string,
  formatConfig: FormatOptions,
) {
  const {filepath, astType} = await findFileWithExtension(appDirectory, 'root');

  if (!filepath || !astType) {
    // TODO throw
    return;
  }

  await replaceFileContent(filepath, formatConfig, async (content) => {
    const tailwindImport = `import tailwindCss from './${tailwindCssPath}';`;
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
          "[{rel: 'stylesheet', href: tailwindCss},",
        ),
      );
  });
}
