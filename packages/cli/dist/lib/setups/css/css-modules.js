import { mergePackageJson } from '../../file.js';
import { getCodeFormatOptions } from '../../format-code.js';
import { injectCssBundlingLink } from './replacers.js';
import { getAssetDir } from '../../build.js';

async function setupCssModules({
  rootDirectory,
  appDirectory
}) {
  const workPromise = Promise.all([
    mergePackageJson(getAssetDir("css-modules"), rootDirectory),
    getCodeFormatOptions(rootDirectory).then(
      (formatConfig) => injectCssBundlingLink(appDirectory, formatConfig)
    )
  ]);
  return {
    workPromise,
    generatedAssets: [],
    helpUrl: "https://github.com/css-modules/css-modules"
  };
}

export { setupCssModules };
