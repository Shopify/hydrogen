import { outputInfo } from '@shopify/cli-kit/node/output';
import { relativePath, joinPath } from '@shopify/cli-kit/node/path';
import { mergePackageJson } from '../../file.js';
import { canWriteFiles, copyAssets } from './assets.js';
import { getCodeFormatOptions } from '../../format-code.js';
import { replaceRootLinks } from './replacers.js';
import { getAssetDir } from '../../build.js';

const tailwindCssPath = "styles/tailwind.css";
async function setupTailwind({ rootDirectory, appDirectory, ...futureOptions }, force = false) {
  const relativeAppDirectory = relativePath(rootDirectory, appDirectory);
  const assetMap = {
    "tailwind.config.js": "tailwind.config.js",
    "postcss.config.js": "postcss.config.js",
    "tailwind.css": joinPath(relativeAppDirectory, tailwindCssPath)
  };
  if (futureOptions.tailwind && futureOptions.postcss) {
    outputInfo(`Tailwind and PostCSS are already setup in ${rootDirectory}.`);
    return;
  }
  if (!await canWriteFiles(assetMap, appDirectory, force)) {
    outputInfo(
      `Skipping CSS setup as some files already exist. You may use \`--force\` or \`-f\` to override it.`
    );
    return;
  }
  const workPromise = Promise.all([
    mergePackageJson(getAssetDir("tailwind"), rootDirectory),
    copyAssets(
      "tailwind",
      assetMap,
      rootDirectory,
      (content, filepath) => filepath === "tailwind.config.js" ? content.replace("{src-dir}", relativeAppDirectory) : content
    ),
    getCodeFormatOptions(rootDirectory).then(
      (formatConfig) => replaceRootLinks(appDirectory, formatConfig, {
        name: "tailwindCss",
        path: tailwindCssPath,
        isDefault: true
      })
    )
  ]);
  return {
    workPromise,
    generatedAssets: Object.values(assetMap),
    helpUrl: "https://tailwindcss.com/docs/configuration"
  };
}

export { setupTailwind };