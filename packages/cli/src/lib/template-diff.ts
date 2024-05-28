import {temporaryDirectory} from 'tempy';
import {createSymlink, copy as copyDirectory} from 'fs-extra/esm';
import {
  copyFile,
  fileExists,
  removeFile as remove,
} from '@shopify/cli-kit/node/fs';
import {joinPath, relativePath} from '@shopify/cli-kit/node/path';
import {readAndParsePackageJson} from '@shopify/cli-kit/node/node-package-manager';
import colors from '@shopify/cli-kit/node/colors';
import {getRepoNodeModules, getStarterDir} from './build.js';
import {mergePackageJson} from './file.js';

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

  console.info(
    `\n-- Applying diff to starter template in\n${colors.dim(
      targetDirectory,
    )}\n`,
  );

  await applyTemplateDiff(targetDirectory, diffDirectory);

  await createSymlink(
    await getRepoNodeModules(),
    joinPath(targetDirectory, 'node_modules'),
  );

  const pw = watch
    ? await import('@parcel/watcher').catch((error) => {
        console.log('Could not watch for file changes.', error);
      })
    : undefined;

  const subscriptions = await Promise.all([
    pw?.subscribe(
      targetDirectory,
      (error, events) => {
        if (error) {
          console.error(error);
          return;
        }

        events.map((event) => {
          return copyFile(
            event.path,
            joinPath(diffDirectory, relativePath(targetDirectory, event.path)),
          );
        });
      },
      {ignore: ['!*.generated.d.ts']},
    ),

    pw?.subscribe(
      diffDirectory,
      async (error, events) => {
        if (error) {
          console.error(error);
          return;
        }

        await events.map((event) => {
          const targetFile = joinPath(
            targetDirectory,
            relativePath(diffDirectory, event.path),
          );

          return event.type === 'delete'
            ? remove(targetFile).catch(() => {})
            : copyFile(event.path, targetFile);
        });
      },
      {ignore: ['*.generated.d.ts', 'package.json', 'tsconfig.json']},
    ),
  ]);

  return {
    targetDirectory,
    cleanup: async () => {
      await Promise.all(subscriptions.map((sub) => sub?.unsubscribe()));
      await remove(targetDirectory);
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
  templateDir = getStarterDir(),
) {
  const [diffPkgJson, templatePkgJson] = await Promise.all([
    readAndParsePackageJson(joinPath(diffDirectory, 'package.json')),
    readAndParsePackageJson(joinPath(templateDir, 'package.json')),
  ]);

  const diffOptions: DiffOptions = (diffPkgJson as any)['h2:diff'] ?? {};

  const createFilter =
    (re: RegExp, skipFiles?: string[]) => (filepath: string) => {
      const filename = relativePath(templateDir, filepath);
      return !re.test(filename) && !skipFiles?.includes(filename);
    };

  await copyDirectory(templateDir, targetDirectory, {
    filter: createFilter(
      /(^|\/|\\)(dist|node_modules|\.cache|.turbo|CHANGELOG\.md)(\/|\\|$)/i,
      diffOptions.skipFiles || [],
    ),
  });
  await copyDirectory(diffDirectory, targetDirectory, {
    filter: createFilter(
      /(^|\/|\\)(dist|node_modules|\.cache|.turbo|package\.json|tsconfig\.json)(\/|\\|$)/i,
    ),
  });

  await mergePackageJson(diffDirectory, targetDirectory, {
    ignoredKeys: ['h2:diff'],
    onResult: (pkgJson) => {
      if (pkgJson.dependencies && templatePkgJson.dependencies) {
        // Restore the original version of this package,
        // which is added as '*' to make --diff work with global CLI.
        pkgJson.dependencies['@shopify/cli-hydrogen'] =
          templatePkgJson.dependencies['@shopify/cli-hydrogen'] ?? '*';
      }

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
}

/**
 * Brings the `dist` directory back to the original project.
 * This is used to run `h2 preview` with the resulting build.
 */
export async function copyDiffBuild(
  generatedDirectory: string,
  diffDirectory: string,
) {
  const target = joinPath(diffDirectory, 'dist');
  await remove(target);
  await Promise.all([
    copyDirectory(joinPath(generatedDirectory, 'dist'), target, {
      overwrite: true,
    }),
    copyFile(
      joinPath(generatedDirectory, '.env'),
      joinPath(diffDirectory, '.env'),
    ),
  ]);
}

/**
 * Brings the `.shopify` directory back to the original project.
 * This is important to keep a reference of the tunnel configuration
 * so that it can be removed in the next run.
 */
export async function copyShopifyConfig(
  generatedDirectory: string,
  diffDirectory: string,
) {
  const source = joinPath(generatedDirectory, '.shopify');
  if (!(await fileExists(source))) return;

  const target = joinPath(diffDirectory, '.shopify');
  await remove(target);
  await copyDirectory(joinPath(generatedDirectory, '.shopify'), target, {
    overwrite: true,
  });
}
