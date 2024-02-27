import {mergePackageJson} from './assets.js';
import {getCodeFormatOptions} from '../../format-code.js';
import type {CssSetupConfig, CssSetupResult} from './common.js';
import {injectCssBundlingLink} from './replacers.js';

export async function setupCssModules({
  rootDirectory,
  appDirectory,
}: CssSetupConfig): Promise<undefined | CssSetupResult> {
  const workPromise = Promise.all([
    mergePackageJson('css-modules', rootDirectory),
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
