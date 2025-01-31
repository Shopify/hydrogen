import {symlink, cp as copyDirectory} from 'node:fs/promises';
import {temporaryDirectory} from 'tempy';
import {
  copyFile,
  fileExists,
  removeFile as remove,
} from '@shopify/cli-kit/node/fs';
import {joinPath, relativePath} from '@shopify/cli-kit/node/path';
import {readAndParsePackageJson} from '@shopify/cli-kit/node/node-package-manager';
import {outputInfo} from '@shopify/cli-kit/node/output';
import colors from '@shopify/cli-kit/node/colors';
import {
  getRepoNodeModules,
  getStarterDir,
  isHydrogenMonorepo,
} from './build.js';
import {mergePackageJson, mergeTsConfig} from './file.js';

/**
 * Creates a new temporary project directory with the starter template and diff applied.
 * Adds a watcher to sync files from the diff directory to the temporary directory.
 * @param diffDirectory Directory with files to apply to the starter template
 * @returns Temporary directory with the starter template and diff applied
 */
export async function prepareDiffDirectory(
  diffDirectory: string,
  watch: boolean,
) {
  const targetDirectory = temporaryDirectory({prefix: 'tmp-hydrogen-diff-'});

  // Do not use a banner here to avoid breaking the targetDirectory filepath
  // to keep it clickable in the terminal.
  outputInfo(
    `\n-- Applying diff to starter template in\n${colors.dim(
      targetDirectory,
    )}\n`,
  );

  // Intuitively, we think the files are coming from the skeleton
  // template in the monorepo instead of the CLI package so we forget
  // forget to start the dev process for the CLI when tinkering with
  // diff examples. Let's use the skeleton source files from the
  // monorepo directly if available to avoid this situation.
  const templateDirectory = await getStarterDir(isHydrogenMonorepo);
  await applyTemplateDiff(targetDirectory, diffDirectory, templateDirectory);

  await symlink(
    await getRepoNodeModules(),
    joinPath(targetDirectory, 'node_modules'),
  );

  const {default: chokidar} = await import('chokidar');

  const subscriptions = watch
    ? [
        // Copy back the changes in generated d.ts from the
        // temporary directory to the original diff directory.
        chokidar
          .watch(joinPath(targetDirectory, '*.generated.d.ts'), {
            ignoreInitial: true,
          })
          .on('all', async (eventName, eventFilePath) => {
            const targetFile = joinPath(
              diffDirectory,
              relativePath(targetDirectory, eventFilePath),
            );

            await copyFile(eventFilePath, targetFile);
          }),

        // Copy new changes in the original diff directory to
        // the temporary directory.
        chokidar
          .watch(diffDirectory, {
            ignoreInitial: true,
            ignored: [
              '**/*.generated.d.ts',
              '**/package.json',
              '**/tsconfig.json',
              '**/.shopify',
            ],
          })
          .on('all', async (eventName, eventFilePath) => {
            const targetFile = joinPath(
              targetDirectory,
              relativePath(diffDirectory, eventFilePath),
            );

            const fileInTemplate = eventFilePath.replace(
              diffDirectory,
              templateDirectory,
            );

            if (eventName === 'unlink') {
              return fileExists(fileInTemplate)
                .then((exists) =>
                  exists
                    ? // Replace it with original file from the starter template.
                      copyFile(fileInTemplate, targetFile)
                    : // Remove the file otherwise.
                      remove(targetFile),
                )
                .catch(() => {});
            }

            return copyFile(eventFilePath, targetFile);
          }),

        // Copy new changes in the starter template to the temporary
        // directory only if they don't overwrite the files in the
        // original diff directory, which have higher priority.
        chokidar
          .watch(templateDirectory, {
            ignoreInitial: true,
            ignored: [
              '**/*.generated.d.ts',
              '**/package.json',
              '**/tsconfig.json',
              '**/.shopify',
            ],
          })
          .on('all', async (eventName, eventFilePath) => {
            const fileInDiff = eventFilePath.replace(
              templateDirectory,
              diffDirectory,
            );

            if (await fileExists(fileInDiff)) return;

            const targetFile = joinPath(
              targetDirectory,
              relativePath(templateDirectory, eventFilePath),
            );

            return eventName === 'unlink'
              ? remove(targetFile).catch(() => {})
              : copyFile(eventFilePath, targetFile);
          }),
      ]
    : [];

  return {
    /**
     * The temporary directory with the starter template and diff applied.
     */
    targetDirectory,
    /**
     * Removes the temporary directory and stops the file watchers.
     */
    cleanup: async () => {
      await Promise.all(subscriptions.map((sub) => sub.close()));
      await remove(targetDirectory);
    },
    /**
     * Brings the `.shopify` directory back to the original project.
     * This is important to keep a reference of the tunnel configuration
     * so that it can be removed in the next run.
     */
    async copyShopifyConfig() {
      const source = joinPath(targetDirectory, '.shopify');
      if (!(await fileExists(source))) return;

      const target = joinPath(diffDirectory, '.shopify');
      await remove(target);
      await copyDirectory(source, target, {recursive: true, force: true});
    },
    /**
     * Brings the `dist` directory back to the original project.
     * This is used to run `h2 preview` with the resulting build.
     */
    async copyDiffBuild() {
      const target = joinPath(diffDirectory, 'dist');
      await remove(target);
      await copyDirectory(joinPath(targetDirectory, 'dist'), target, {
        force: true,
        recursive: true,
      });
    },
    /**
     * Brings the generated d.ts files back to the original project.
     */
    copyDiffCodegen() {
      return Promise.all([
        copyFile(
          joinPath(targetDirectory, 'storefrontapi.generated.d.ts'),
          joinPath(diffDirectory, 'storefrontapi.generated.d.ts'),
        ),
        copyFile(
          joinPath(targetDirectory, 'customer-accountapi.generated.d.ts'),
          joinPath(diffDirectory, 'customer-accountapi.generated.d.ts'),
        ),
      ]);
    },
  };
}

type DiffOptions = {
  skipFiles?: string[];
  skipDependencies?: string[];
  skipDevDependencies?: string[];
};

export async function applyTemplateDiff(
  targetDirectory: string,
  diffDirectory: string,
  templateDir?: string,
) {
  console.log('applyTemplateDiff 1');
  templateDir ??= await getStarterDir();
  console.log('applyTemplateDiff 2');

  const diffPkgJson = await readAndParsePackageJson(
    joinPath(diffDirectory, 'package.json'),
  );
  const diffOptions: DiffOptions = (diffPkgJson as any)['h2:diff'] ?? {};
  console.log('applyTemplateDiff 3');

  const createFilter =
    (re: RegExp, skipFiles?: string[]) => (filepath: string) => {
      const filename = relativePath(templateDir, filepath);
      return !re.test(filename) && !skipFiles?.includes(filename);
    };

  console.log('applyTemplateDiff 4');
  await copyDirectory(templateDir, targetDirectory, {
    force: true,
    recursive: true,
    filter: createFilter(
      // Do not copy .shopify from skeleton to avoid linking in examples inadvertedly
      /(^|\/|\\)(dist|node_modules|\.cache|\.turbo|\.shopify|CHANGELOG\.md)(\/|\\|$)/i,
      diffOptions.skipFiles || [],
    ),
  });
  console.log('applyTemplateDiff 5');
  await copyDirectory(diffDirectory, targetDirectory, {
    force: true,
    recursive: true,
    filter: createFilter(
      /(^|\/|\\)(dist|node_modules|\.cache|.turbo|package\.json|tsconfig\.json)(\/|\\|$)/i,
    ),
  });

  console.log('applyTemplateDiff 6');
  await mergePackageJson(diffDirectory, targetDirectory, {
    ignoredKeys: ['h2:diff'],
    onResult: (pkgJson) => {
      for (const key of ['build', 'dev', 'preview']) {
        const scriptLine = pkgJson.scripts?.[key];
        if (pkgJson.scripts?.[key] && typeof scriptLine === 'string') {
          pkgJson.scripts[key] = scriptLine.replace(/\s+--diff/, '');
        }
      }

      if (diffOptions.skipDependencies && pkgJson.dependencies) {
        for (const dep of diffOptions.skipDependencies) {
          delete pkgJson.dependencies[dep];
        }
      }

      if (diffOptions.skipDevDependencies && pkgJson.devDependencies) {
        for (const devDep of diffOptions.skipDevDependencies) {
          delete pkgJson.devDependencies[devDep];
        }
      }

      return pkgJson;
    },
  });

  console.log('About to call mergeTsConfig');
  await mergeTsConfig(diffDirectory, targetDirectory);
}
