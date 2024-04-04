import {rmdirSync} from 'node:fs';
import {temporaryDirectory} from 'tempy';
import {createSymlink, copy as copyDirectory} from 'fs-extra/esm';
import {copyFile, removeFile as remove} from '@shopify/cli-kit/node/fs';
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
  process.on('exit', () => rmdirSync(targetDirectory, {recursive: true}));

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

  if (watch) {
    const pw = await import('@parcel/watcher').catch((error) => {
      console.log('Could not watch for file changes.', error);
    });

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
    );

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
    );
  }

  return targetDirectory;
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
  const diffPkgJson: Record<string, any> = await readAndParsePackageJson(
    joinPath(diffDirectory, 'package.json'),
  );

  const diffOptions: DiffOptions = diffPkgJson['h2:diff'] ?? {};

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
      for (const key of ['build', 'dev']) {
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

export async function copyDiffBuild(
  targetDirectory: string,
  diffDirectory: string,
) {
  const targetDist = joinPath(diffDirectory, 'dist');
  await remove(targetDist);
  await Promise.all([
    copyDirectory(joinPath(targetDirectory, 'dist'), targetDist, {
      overwrite: true,
    }),
    copyFile(
      joinPath(targetDirectory, '.env'),
      joinPath(diffDirectory, '.env'),
    ),
  ]);
}
