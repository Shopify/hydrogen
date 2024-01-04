import {rmdirSync} from 'node:fs';
import {temporaryDirectory} from 'tempy';
import {
  createSymlink,
  copy as copyDirectory,
  remove as removeDirectory,
} from 'fs-extra/esm';
import {copyFile, removeFile} from '@shopify/cli-kit/node/fs';
import {joinPath, relativePath} from '@shopify/cli-kit/node/path';
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
            ? removeFile(targetFile).catch(() => {})
            : copyFile(event.path, targetFile);
        });
      },
      {ignore: ['*.generated.d.ts', 'package.json', 'tsconfig.json']},
    );
  }

  return targetDirectory;
}

export async function applyTemplateDiff(
  targetDirectory: string,
  diffDirectory: string,
  templateDir = getStarterDir(),
) {
  const createFilter = (re: RegExp) => (filepath: string) =>
    !re.test(relativePath(templateDir, filepath));

  await copyDirectory(templateDir, targetDirectory, {
    filter: createFilter(/[\/\\](dist|node_modules|\.cache)(\/|\\|$)/i),
  });
  await copyDirectory(diffDirectory, targetDirectory, {
    filter: createFilter(
      /[\/\\](dist|node_modules|\.cache|package\.json|tsconfig\.json)(\/|\\|$)/i,
    ),
  });

  await mergePackageJson(diffDirectory, targetDirectory, {
    ignoredKeys: ['scripts'],
  });
}

export async function copyDiffBuild(
  targetDirectory: string,
  diffDirectory: string,
) {
  const targetDist = joinPath(diffDirectory, 'dist');
  await removeDirectory(targetDist);
  await copyDirectory(joinPath(targetDirectory, 'dist'), targetDist, {
    overwrite: true,
  });
}
