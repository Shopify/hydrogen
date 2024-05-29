import {mergePackageJson} from '../../file.js';
import {getCodeFormatOptions} from '../../format-code.js';
import type {CssSetupConfig, CssSetupResult} from './common.js';
import {injectCssBundlingLink} from './replacers.js';
import {getAssetsDir} from '../../build.js';

export async function setupCssModules({
  rootDirectory,
  appDirectory,
}: CssSetupConfig): Promise<undefined | CssSetupResult> {
  const workPromise = Promise.all([
    mergePackageJson(await getAssetsDir('css-modules'), rootDirectory),
    getCodeFormatOptions(rootDirectory).then((formatConfig) =>
      injectCssBundlingLink(appDirectory, formatConfig),
    ),
  ]);

  return {
    workPromise,
    generatedAssets: [],
    helpUrl: 'https://github.com/css-modules/css-modules',
  };
}
