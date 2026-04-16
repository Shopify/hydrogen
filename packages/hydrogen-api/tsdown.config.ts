import {defineConfig} from 'tsdown';

const DEV_FLAG = '__HYDROGEN_DEV__';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  hash: false,
  sourcemap: true,
  fixedExtension: false,
  define: {[DEV_FLAG]: 'false'},
  copy: {
    from: 'src/generated/*',
    to: 'dist/generated',
  },
  // Fail the build if `define` didn't replace the dev flag — otherwise
  // dev-only warnings ship to consumers and their bundlers hit a
  // ReferenceError on the undeclared global at runtime.
  hooks: {
    'build:done': ({chunks}) => {
      for (const chunk of chunks) {
        if ('code' in chunk && chunk.code.includes(DEV_FLAG)) {
          throw new Error(
            `Build failed: ${DEV_FLAG} was not replaced in ${chunk.fileName}. ` +
              `Check the \`define\` option in tsdown.config.ts.`,
          );
        }
      }
    },
  },
});
