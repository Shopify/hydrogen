import {resolvePath} from '@shopify/cli-kit/node/path';
import Command from '@shopify/cli-kit/node/base-command';
import {
  renderConfirmationPrompt,
  renderSuccess,
  renderTasks,
} from '@shopify/cli-kit/node/ui';
import {
  copyFile,
  moveFile,
  removeFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {
  getPackageManager,
  installNodeModules,
} from '@shopify/cli-kit/node/node-package-manager';
import {commonFlags, flagsToCamelObject} from '../../../lib/flags.js';
import {getRemixConfig} from '../../../lib/remix-config.js';
import {mergePackageJson, replaceFileContent} from '../../../lib/file.js';
import {importLangAstGrep} from '../../../lib/ast.js';
import {getAssetDir} from '../../../lib/build.js';
import {getCodeFormatOptions} from '../../../lib/format-code.js';

export default class SetupVite extends Command {
  static description = 'EXPERIMENTAL: Upgrades the project to use Vite.';

  static flags = {
    ...commonFlags.path,
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(SetupVite);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    await runSetupVite({
      ...flagsToCamelObject(flags),
      directory,
    });
  }
}

export async function runSetupVite({directory}: {directory: string}) {
  const remixConfigPromise = getRemixConfig(directory);

  const shouldContinue = await renderConfirmationPrompt({
    message:
      'Are you sure you want to upgrade to Vite?\nThis is still an experimental feature and may not work as expected',
  });

  if (!shouldContinue) return;

  const handlePartialIssue = () => {};

  const backgroundWorkPromise = Promise.all([
    moveFile(
      resolvePath(directory, 'remix.env.d.ts'),
      resolvePath(directory, 'env.d.ts'),
    )
      .then(() =>
        replaceFileContent(
          resolvePath(directory, 'env.d.ts'),
          false,
          (content) =>
            content.replace('types="@remix-run/dev"', 'types="vite/client"'),
        ),
      )
      .catch(handlePartialIssue),
    moveFile(
      resolvePath(directory, '.eslintrc.js'),
      resolvePath(directory, '.eslintrc.cjs'),
    ).catch(handlePartialIssue),
    moveFile(
      resolvePath(directory, 'postcss.config.js'),
      resolvePath(directory, 'postcss.config.cjs'),
    ).catch(handlePartialIssue),
    remixConfigPromise.then((config) => {
      const serverEntry = config.serverEntryPoint || 'server.js';
      const isTS = serverEntry.endsWith('.ts');
      const fileExt = isTS ? 'tsx' : 'jsx';
      const viteAssets = getAssetDir('vite');

      return Promise.all([
        removeFile(resolvePath(directory, 'remix.config.js')).catch(
          handlePartialIssue,
        ),
        copyFile(
          resolvePath(viteAssets, 'vite.config.js'),
          resolvePath(directory, 'vite.config.' + fileExt.slice(0, 2)),
        ),
        mergePackageJson(viteAssets, directory),
        replaceFileContent(
          resolvePath(directory, serverEntry),
          false,
          (content) =>
            (isTS ? '// @ts-ignore\n' : '') +
            content.replace(
              '@remix-run/dev/server-build',
              'virtual:remix/server-build',
            ),
        ),
        importLangAstGrep(fileExt).then(async (astGrep) => {
          const codeFormatOpt = getCodeFormatOptions(directory);
          const rootFilepath = resolvePath(
            config.appDirectory,
            'root.' + fileExt,
          );

          // Add ?url to all CSS imports:
          await new Promise(async (resolve, reject) => {
            const fileNumber = await astGrep.findInFiles(
              {
                paths: [
                  rootFilepath,
                  resolvePath(config.appDirectory, 'routes'),
                ],
                matcher: {
                  rule: {
                    kind: 'string_fragment',
                    regex: '\\.css$',
                    inside: {
                      kind: 'import_statement',
                      stopBy: 'end',
                    },
                  },
                },
              },
              async (err, nodes) => {
                if (err) reject(err);
                const nodeMap = {} as Record<
                  string,
                  {content: string; positions: number[]}
                >;

                nodes.forEach((node) => {
                  const filename = node.getRoot().filename();
                  const content = node.getRoot().root().text();
                  const position = node.range().end.index;

                  const tmp = nodeMap[filename] || {content, positions: []};
                  tmp.positions.push(position);
                  nodeMap[filename] = tmp;
                });

                await Promise.all(
                  Object.entries(nodeMap).flatMap(
                    ([filename, {content, positions}]) => {
                      // Start from the end to avoid moving character indexes:
                      positions.reverse();

                      for (const position of positions) {
                        content =
                          content.slice(0, position) +
                          '?url' +
                          content.slice(position);
                      }

                      return writeFile(filename, content);
                    },
                  ),
                );

                resolve(null);
              },
            );

            if (fileNumber === 0) resolve(null);
          });

          // Remove the LiveReload import and usage:
          await replaceFileContent(
            rootFilepath,
            await codeFormatOpt,
            (content) => {
              const root = astGrep.parse(content).root();
              const liveReloadRegex = 'LiveReload';
              const hasLiveReloadRule = {
                kind: 'identifier',
                regex: liveReloadRegex,
              };

              const liveReloadImport = root.find({
                rule: {
                  kind: 'import_specifier',
                  regex: liveReloadRegex,
                  inside: {
                    kind: 'import_statement',
                    stopBy: 'end',
                  },
                },
              });

              const liveReloadElements = root.findAll({
                rule: {
                  any: [
                    {
                      kind: 'jsx_self_closing_element',
                      has: hasLiveReloadRule,
                    },
                    {
                      kind: 'jsx_element',
                      has: {
                        kind: 'jsx_opening_element',
                        has: hasLiveReloadRule,
                      },
                    },
                  ],
                },
              });

              for (const node of [
                // From bottom to top
                ...liveReloadElements.reverse(),
                liveReloadImport,
              ]) {
                if (!node) continue;

                const {start, end} = node.range();
                content =
                  content.slice(0, start.index) + content.slice(end.index);
              }

              // Remove the trailing comma from the import statement:
              return content.replace(/,\s*,/g, ',');
            },
          );
        }),
      ]);
    }),
  ]);

  await renderTasks([
    {
      title: 'Updating files',
      task: async () => {
        await backgroundWorkPromise;
      },
    },
    {
      title: 'Installing new dependencies',
      task: async () => {
        await installNodeModules({
          directory,
          packageManager: await getPackageManager(directory),
          args: [],
        });
      },
    },
  ]);

  renderSuccess({
    headline: `Your Vite project is ready!`,
    body: `We've modified your project to use Vite experimental.\nPlease use git to review the changes.`,
  });
}
