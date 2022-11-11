/// <reference types="vitest" />
import {resolve} from 'path';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';

export default defineConfig(({mode}) => {
  if (mode.includes('umdbuild')) {
    // config for our UMD builds, which are distinct enough that they need their own
    return {
      build: {
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'hydrogenreact',
          fileName: () =>
            `hydrogen-react.${mode === 'umdbuilddev' ? 'dev' : 'prod'}.js`,
          formats: ['umd'],
        },
        sourcemap: true,
        minify: mode !== 'umdbuilddev',
        emptyOutDir: false,
        outDir: `dist/umd/`,
        rollupOptions: {
          // don't bundle these packages into our lib
          external: ['react', 'react-dom'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
            },
          },
        },
      },
      define: {
        __HYDROGEN_DEV__: mode === 'umdbuilddev',
        __HYDROGEN_TEST__: false,
      },
      plugins: [
        react({
          // use classic runtime so that it can rely on the global 'React' variable to createElements
          jsxRuntime: 'classic',
        }),
      ],
    };
  }

  return {
    build: {
      outDir: `dist/${mode === 'devbuild' ? 'dev' : 'prod'}/`,
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'hydrogen-react',
        fileName: (format) => `[name].${format === 'cjs' ? '' : 'm'}js`,
        formats: ['es', 'cjs'],
      },
      sourcemap: true,
      minify: false,
      emptyOutDir: false,
      rollupOptions: {
        external: (id) => {
          /**
           * Don't bundle these packages into our lib
           *
           * This creates a better build for node esm environments,
           * but if we wanted a browser esm build, we would either have to tell devs to use "import maps"
           * or to create a new bundle that doesn't use these as externals
           * */
          if (id.includes('xstate')) {
            return false;
          }

          return externals.includes(id);
        },
        output: {
          // keep the folder structure of the components in the dist folder
          preserveModules: true,
          preserveModulesRoot: 'src',
        },
      },
    },
    define: {
      __HYDROGEN_DEV__: mode === 'devbuild' || mode === 'test',
      __HYDROGEN_TEST__: mode === 'test',
    },
    plugins: [react()],
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: './vitest.setup.ts',
      restoreMocks: true,
    },
  };
});

const externals = [
  ...Object.keys(packageJson.dependencies),
  ...Object.keys(packageJson.peerDependencies),
  'react/jsx-runtime',
  'worktop/cookie',
];
