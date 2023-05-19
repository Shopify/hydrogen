import {fileURLToPath} from 'node:url';
import {fileExists, copyFile} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {renderConfirmationPrompt} from '@shopify/cli-kit/node/ui';

export function copyAssets(
  feature: 'tailwind',
  assets: Record<string, string>,
  appDirectory: string,
) {
  const setupAssetsPath = fileURLToPath(
    new URL(`../setup-assets/${feature}`, import.meta.url),
  );

  return Promise.all(
    Object.entries(assets).map(([source, destination]) =>
      copyFile(
        joinPath(setupAssetsPath, source),
        joinPath(appDirectory, destination),
      ),
    ),
  );
}

export async function canWriteFiles(
  assetMap: Record<string, string>,
  directory: string,
  force: boolean,
) {
  const fileExistPromises = Object.values(assetMap).map((file) =>
    fileExists(joinPath(directory, file)).then((exists) =>
      exists ? file : null,
    ),
  );

  const existingFiles = (await Promise.all(fileExistPromises)).filter(
    Boolean,
  ) as string[];

  if (existingFiles.length > 0) {
    if (!force) {
      const overwrite = await renderConfirmationPrompt({
        message: `Some files already exist (${existingFiles.join(
          ', ',
        )}). Overwrite?`,
        defaultValue: false,
      });

      if (!overwrite) {
        return false;
      }
    }
  }

  return true;
}
