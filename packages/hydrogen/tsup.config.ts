import {defineConfig} from 'tsup';
import {devConfig, prodConfig, outDir} from '../../tsup.config';

const buildEntry = 'src/build.ts';

export default [
  devConfig,
  prodConfig,
  defineConfig({
    ...prodConfig,
    outDir: `${outDir}/build`,
    entry: {index: buildEntry},
    dts: true,
    onSuccess: undefined,
    minify: false,
    publicDir: 'src/routing/dev-routes',
  }),
  defineConfig({
    entry: ['src/templates/**/*.ts', 'src/templates/**/*.tsx'],
    outDir: `${outDir}/templates`,
    format: 'esm',
    minify: false,
    bundle: false,
    sourcemap: false,
    splitting: false,
    // Rollup fails due to JSX syntax with this option:
    treeshake: false,
    // Force .jsx extension for compiled templates:
    outExtension: () => ({js: '.jsx'}),
    // Avoid dropping comments in ESBuild:
    esbuildOptions: (options) => {
      options.legalComments = 'inline';
    },
  }),
];
