import {defineConfig} from 'tsdown';

const NODE_ENV_TOKEN = 'process.env.NODE_ENV';

// Fail the build if `env` didn't replace `process.env.NODE_ENV` —
// otherwise dev-only warnings leak into production bundles and
// consumers pay for runtime env lookups we meant to eliminate.
const envGuard = {
  'build:done': ({
    chunks,
  }: {
    chunks: readonly {fileName: string; code?: string}[];
  }) => {
    for (const chunk of chunks) {
      if (chunk.code?.includes(NODE_ENV_TOKEN)) {
        throw new Error(
          `Build failed: ${NODE_ENV_TOKEN} was not replaced in ${chunk.fileName}. ` +
            `Check the \`env\` option in tsdown.config.ts.`,
        );
      }
    }
  },
};

const sharedEnvBuildOptions = {
  entry: ['src/index.ts'],
  format: ['esm'] as const,
  dts: true,
  hash: false,
  sourcemap: true,
  fixedExtension: false,
  hooks: envGuard,
};

export default defineConfig([
  // Development build — dev warnings kept, not minified. Consumers
  // opt in via the `development` export condition (Vite dev, etc.).
  {
    ...sharedEnvBuildOptions,
    outDir: 'dist/development',
    env: {NODE_ENV: 'development'},
    clean: ['dist'],
  },
  // Production build — dev warnings eliminated by DCE, minified.
  // This is the default every consumer gets unless they opt in to
  // the `development` condition.
  {
    ...sharedEnvBuildOptions,
    outDir: 'dist/production',
    env: {NODE_ENV: 'production'},
    minify: true,
  },
  // Env-agnostic: schema path resolver + bundled schema JSON files.
  // Shipped once at `dist/` since the schema surface does not vary
  // by environment and the JSON files are large enough that we
  // don't want to duplicate them per build.
  {
    entry: ['src/schema.ts'],
    format: ['esm'] as const,
    dts: true,
    hash: false,
    sourcemap: true,
    fixedExtension: false,
    outDir: 'dist',
    copy: {
      from: 'src/generated/*',
      to: 'dist/generated',
    },
  },
]);
