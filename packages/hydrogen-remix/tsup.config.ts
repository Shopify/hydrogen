import {defineConfig} from 'tsup';
import {devConfig, prodConfig} from '../../tsup.config';

const buildEntry = 'src/build.ts';

export default [
  devConfig,
  prodConfig,
  defineConfig({
    ...prodConfig,
    entry: [buildEntry],
    dts: buildEntry,
    onSuccess: undefined,
    minify: false,
  }),
];
