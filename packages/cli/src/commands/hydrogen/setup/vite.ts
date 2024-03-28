import {joinPath, resolvePath} from '@shopify/cli-kit/node/path';
import Command from '@shopify/cli-kit/node/base-command';
import {renderSuccess, renderTasks} from '@shopify/cli-kit/node/ui';
import {
  moveFile,
  readFile,
  removeFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {
  getPackageManager,
  installNodeModules,
  readAndParsePackageJson,
} from '@shopify/cli-kit/node/node-package-manager';
import {commonFlags, flagsToCamelObject} from '../../../lib/flags.js';
import {getRawRemixConfig} from '../../../lib/remix-config.js';
import {mergePackageJson, replaceFileContent} from '../../../lib/file.js';
import {importLangAstGrep} from '../../../lib/ast.js';
import {getAssetDir} from '../../../lib/build.js';
import {formatCode, getCodeFormatOptions} from '../../../lib/format-code.js';
import {hasViteConfig} from '../../../lib/vite-config.js';
import {AbortError} from '@shopify/cli-kit/node/error';
import {outputNewline} from '@shopify/cli-kit/node/output';

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
  outputNewline();
  if (await hasViteConfig(directory)) {
    throw new AbortError('This project already has a Vite config file.');
  }

  const [rawRemixConfig, pkgJson] = await Promise.all([
    getRawRemixConfig(directory),
    readAndParsePackageJson(joinPath(directory, 'package.json')),
  ]);

  const codeFormatOptPromise = getCodeFormatOptions(directory);
  const serverEntry = rawRemixConfig.server || 'server.js';
  const isTS = serverEntry.endsWith('.ts');
  const fileExt = isTS ? 'tsx' : 'jsx';
  const viteAssets = getAssetDir('vite');

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

    removeFile(resolvePath(directory, 'remix.config.js')).catch(
      handlePartialIssue,
    ),

    // Adjust dependencies:
    mergePackageJson(viteAssets, directory, {
      onResult(pkgJson) {
        if (pkgJson.dependencies) {
          // This dependency is not needed in Vite projects:
          delete pkgJson.dependencies['@remix-run/css-bundle'];
        }

        if (pkgJson.devDependencies) {
          if (pkgJson.devDependencies['@vanilla-extract/css']) {
            // Required vanilla-extract dependency for Vite
            pkgJson.devDependencies['@vanilla-extract/vite-plugin'] = '^4.0.0';

            // Sort dependencies:
            pkgJson.devDependencies = Object.keys(pkgJson.devDependencies)
              .sort()
              .reduce((acc, key) => {
                acc[key] = pkgJson.devDependencies?.[key]!;
                return acc;
              }, {} as Record<string, string>);
          }
        }

        return pkgJson;
      },
    }),

    // Build `vite.config.js` for the project:
    readFile(resolvePath(viteAssets, 'vite.config.js')).then(
      async (viteConfigContent) => {
        const hasVanillaExtract =
          !!pkgJson.devDependencies?.['@vanilla-extract/css'];

        if (hasVanillaExtract) {
          viteConfigContent = viteConfigContent
            .replace(
              /\n\n/g,
              `\nimport {vanillaExtractPlugin} from '@vanilla-extract/vite-plugin';\n\n`,
            )
            .replace(/^(\s+)\],/m, '$1  vanillaExtractPlugin(),\n$1],');
        }

        const {future, appDirectory, ignoredRouteFiles, routes} =
          rawRemixConfig;

        // Future flags:
        for (const flag of [
          'v3_fetcherPersist',
          'v3_throwAbortReason',
          'v3_relativeSplatPath',
        ] as const) {
          if (!future?.[flag]) {
            viteConfigContent = viteConfigContent.replace(
              `${flag}: true`,
              `${flag}: false`,
            );
          }
        }

        if (appDirectory && appDirectory !== 'app') {
          viteConfigContent = viteConfigContent.replace(
            /^(\s+)(future:)/m,
            `$1appDirectory: '${appDirectory}',\n$1$2`,
          );
        }

        if (ignoredRouteFiles) {
          viteConfigContent = viteConfigContent.replace(
            /^(\s+)(future:)/m,
            `$1ignoredRouteFiles: ${JSON.stringify(ignoredRouteFiles)},\n$1$2`,
          );
        }

        if (routes) {
          viteConfigContent = viteConfigContent.replace(
            /^(\s+)(future:)/m,
            `$1routes: ${routes.toString()},\n$1$2`,
          );
        }

        const viteConfigPath = resolvePath(
          directory,
          'vite.config.' + fileExt.slice(0, 2),
        );

        viteConfigContent = await formatCode(
          viteConfigContent,
          await codeFormatOptPromise,
          viteConfigPath,
        );

        return writeFile(viteConfigPath, viteConfigContent);
      },
    ),

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

    // Adjust CSS imports in the project:
    importLangAstGrep(fileExt).then(async (astGrep) => {
      const appDirectory = resolvePath(
        directory,
        rawRemixConfig.appDirectory ?? 'app',
      );

      const rootFilepath = joinPath(appDirectory, 'root.' + fileExt);

      // Add ?url to all CSS imports:
      await new Promise(async (resolve, reject) => {
        const fileNumber = await astGrep.findInFiles(
          {
            paths: [rootFilepath, joinPath(appDirectory, 'routes')],
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
              if (node.text().endsWith('.module.css')) {
                // Skip for CSS modules
                return;
              }

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
        await codeFormatOptPromise,
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
            content = content.slice(0, start.index) + content.slice(end.index);
          }

          return (
            content
              // Remove the trailing comma from the import statement:
              .replace(/,\s*,/g, ',')
              // Remove cssBundleHref import
              .replace(
                /import\s+{\s+cssBundleHref\s+}\s+from\s+['"]@remix-run\/css-bundle['"];?\n/,
                '',
              )
              // Remove cssBundleHref usage
              .replace(/\.\.\.\(\s*cssBundleHref[^)]+\),?/, '')
          );
        },
      );
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
    body: `We've modified your project to use Vite.\nPlease use Git to review the changes.`,
    nextSteps: [
      rawRemixConfig.mdx
        ? 'Setup MDX support in Vite: https://remix.run/docs/en/main/future/vite#add-mdx-plugin'
        : '',
      `See more information about Vite in Remix at https://remix.run/docs/en/main/future/vite`,
    ].filter(Boolean),
  });
}
