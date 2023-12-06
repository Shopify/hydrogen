import {rmdirSync} from 'node:fs';
import {temporaryDirectory} from 'tempy';
import {copy as copyWithFilter, createSymlink} from 'fs-extra/esm';
import {copyFile, removeFile} from '@shopify/cli-kit/node/fs';
import {joinPath, relativePath} from '@shopify/cli-kit/node/path';
import colors from '@shopify/cli-kit/node/colors';
import {getRepoNodeModules, getStarterDir} from './build.js';

/**
 * Creates a new temporary project directory with the starter template and diff applied.
 * Adds a watcher to sync files from the diff directory to the temporary directory.
 * @param diffDirectory Directory with files to apply to the starter template
 * @returns Temporary directory with the starter template and diff applied
 */
export async function prepareDiffDirectory(diffDirectory: string) {
  const targetDirectory = temporaryDirectory({prefix: 'tmp-hydrogen-diff-'});
  process.on('exit', () => rmdirSync(targetDirectory, {recursive: true}));

  console.info(
    `\n-- Applying diff to starter template in\n${colors.dim(
      targetDirectory,
    )}\n`,
  );

  const templateDir = getStarterDir();
  const filter = (filepath: string) => {
    return !/[\/\\](dist|node_modules|\.cache)(\/|\\|$)/i.test(
      relativePath(templateDir, filepath),
    );
  };

  await copyWithFilter(templateDir, targetDirectory, {filter});
  await copyWithFilter(diffDirectory, targetDirectory, {filter});
  await copyFile(
    joinPath(templateDir, 'tsconfig.json'),
    joinPath(targetDirectory, 'tsconfig.json'),
  );

  await createSymlink(
    await getRepoNodeModules(),
    joinPath(targetDirectory, 'node_modules'),
  );

  try {
    const pw = await import('@parcel/watcher');

    pw.subscribe(
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

    pw.subscribe(
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

          if (event.type === 'delete') {
            return removeFile(targetFile).catch(() => {});
          } else {
            return copyFile(event.path, targetFile);
          }
        });
      },
      {ignore: ['*.generated.d.ts']},
    );
  } catch (error) {
    console.log('Could not watch for file changes.', error);
  }

  return targetDirectory;
}
