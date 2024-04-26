import { mergePackageJson } from '../../file.js';
import { getCodeFormatOptions } from '../../format-code.js';
import { injectCssBundlingLink } from './replacers.js';
import { getAssetDir } from '../../build.js';

async function setupVanillaExtract({
  rootDirectory,
  appDirectory
}) {
  const workPromise = Promise.all([
    mergePackageJson(getAssetDir("vanilla-extract"), rootDirectory),
    getCodeFormatOptions(rootDirectory).then(
      (formatConfig) => injectCssBundlingLink(appDirectory, formatConfig)
    )
  ]);
  return {
    workPromise,
    generatedAssets: [],
    helpUrl: "https://vanilla-extract.style/documentation/styling/"
  };
}

export { setupVanillaExtract };
