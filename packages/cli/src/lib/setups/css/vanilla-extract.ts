import {mergePackageJson} from './assets.js';
import {getCodeFormatOptions} from '../../format-code.js';
import type {SetupConfig, SetupResult} from './common.js';
import {injectCssBundlingLink} from './replacers.js';

export async function setupVanillaExtract({
  rootDirectory,
  appDirectory,
}: SetupConfig): Promise<undefined | SetupResult> {
  const workPromise = Promise.all([
    mergePackageJson('vanilla-extract', rootDirectory),
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
