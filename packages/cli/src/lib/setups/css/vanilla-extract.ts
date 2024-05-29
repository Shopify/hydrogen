import {mergePackageJson} from '../../file.js';
import {getCodeFormatOptions} from '../../format-code.js';
import {injectCssBundlingLink} from './replacers.js';
import {getSetupAssetDir} from '../../build.js';
import type {CssSetupConfig, CssSetupResult} from './common.js';

export async function setupVanillaExtract({
  rootDirectory,
  appDirectory,
}: CssSetupConfig): Promise<undefined | CssSetupResult> {
  const workPromise = Promise.all([
    mergePackageJson(getSetupAssetDir('vanilla-extract'), rootDirectory),
    getCodeFormatOptions(rootDirectory).then((formatConfig) =>
      injectCssBundlingLink(appDirectory, formatConfig),
    ),
  ]);

  return {
    workPromise,
    generatedAssets: [],
    helpUrl: 'https://vanilla-extract.style/documentation/styling/',
  };
}
