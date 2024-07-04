import { readFile, writeFile, fileExists } from '@shopify/cli-kit/node/fs';
import { joinPath } from '@shopify/cli-kit/node/path';
import { renderConfirmationPrompt } from '@shopify/cli-kit/node/ui';
import { getAssetsDir } from '../../build.js';

const SETUP_CSS_STRATEGIES = [
  "tailwind",
  "css-modules",
  "vanilla-extract",
  "postcss"
];
async function copyAssets(feature, assets, rootDirectory, replacer = (content, filename) => content) {
  const setupAssetsPath = await getAssetsDir(feature);
  return Promise.all(
    Object.entries(assets).map(async ([source, destination]) => {
      const content = await readFile(joinPath(setupAssetsPath, source));
      await writeFile(
        joinPath(rootDirectory, destination),
        replacer(content, source)
      );
    })
  );
}
async function canWriteFiles(assetMap, directory, force) {
  const fileExistPromises = Object.values(assetMap).map(
    (file) => fileExists(joinPath(directory, file)).then(
      (exists) => exists ? file : null
    )
  );
  const existingFiles = (await Promise.all(fileExistPromises)).filter(
    Boolean
  );
  if (existingFiles.length > 0) {
    if (!force) {
      const overwrite = await renderConfirmationPrompt({
        message: `Some files already exist (${existingFiles.join(
          ", "
        )}). Overwrite?`,
        defaultValue: false
      });
      if (!overwrite) {
        return false;
      }
    }
  }
  return true;
}

export { SETUP_CSS_STRATEGIES, canWriteFiles, copyAssets };
