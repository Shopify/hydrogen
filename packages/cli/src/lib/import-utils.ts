import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {AbortError} from '@shopify/cli-kit/node/error';
import {
  findUpAndReadPackageJson,
  getPackageManager,
  lockfilesByManager,
} from '@shopify/cli-kit/node/node-package-manager';
import {dirname, joinPath} from '@shopify/cli-kit/node/path';

const require = createRequire(import.meta.url);

export type Vite = typeof import('vite');

// napi-rs loaders (rolldown, @ast-grep/napi, lightningcss...) throw this when
// the platform-specific optional dependency is missing from node_modules.
// That's a broken install in the user's project rather than a Hydrogen bug, so
// it must not reach them as an unhandled crash.
const MISSING_NATIVE_BINDING_MESSAGE = 'Cannot find native binding';

function isMissingNativeBindingError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    error.message.includes(MISSING_NATIVE_BINDING_MESSAGE)
  );
}

/**
 * Best-effort name of the dependency whose native binding failed to load,
 * read from the topmost `node_modules` frame of the stack.
 */
function nativeBindingPackageName(error: Error): string | undefined {
  const match = error.stack?.match(
    /node_modules[\\/](?:\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?(@[^\\/]+[\\/][^\\/]+|[^@][^\\/]*)/,
  );

  return match?.[1]?.replace(/\\/g, '/');
}

/**
 * Turns a missing native binding failure into a handled error with recovery
 * steps for the project's package manager. It is an `AbortError` so the CLI
 * renders it as a user-facing error instead of reporting an unexpected crash.
 */
export async function missingNativeBindingError(
  error: Error,
  root: string,
): Promise<AbortError> {
  const packageManager = await getPackageManager(root);
  const lockfile = lockfilesByManager[packageManager];
  const installCommand =
    packageManager === 'unknown' ? 'npm install' : `${packageManager} install`;
  const packageName = nativeBindingPackageName(error);

  return new AbortError(
    packageName
      ? `The '${packageName}' dependency could not load its native binding.`
      : 'A dependency could not load its native binding.',
    'The platform-specific binary for your operating system and CPU architecture is missing from node_modules. This is a dependency installation problem in your project, not a bug in the Hydrogen CLI.',
    [
      `Delete the \`node_modules\` directory${
        lockfile ? ` and \`${lockfile}\`` : ''
      } in your project.`,
      `Run \`${installCommand}\` and try this command again.`,
      'If it happens again, check that dependencies are not installed with `--no-optional`, and that the lockfile was not generated on a different operating system or CPU architecture.',
    ],
  );
}

export async function importVite(root: string): Promise<Vite> {
  let vitePath: string;

  try {
    vitePath = require.resolve(
      'vite',
      process.env.SHOPIFY_UNIT_TEST ? undefined : {paths: [root]},
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error as Error & {code?: string}).code === 'MODULE_NOT_FOUND'
    ) {
      throw new AbortError(
        "Could not find the 'vite' package in your project.",
        'Hydrogen uses Vite to run this command.',
        [
          'Run this command from the root directory of your Hydrogen app.',
          'Install your project dependencies (for example, by running `npm install`) and try again.',
        ],
      );
    }

    throw error;
  }

  const vitePackageJson = await findUpAndReadPackageJson(vitePath);

  // vite 7
  let viteNodeIndexFile = (vitePackageJson.content as any).exports?.['.'];

  // vite 6
  if (typeof viteNodeIndexFile !== 'string') {
    viteNodeIndexFile = viteNodeIndexFile?.import;
  }

  // vite 5
  if (typeof viteNodeIndexFile !== 'string') {
    viteNodeIndexFile = viteNodeIndexFile.default;
  }

  const viteNodePath = joinPath(
    dirname(vitePackageJson.path),
    viteNodeIndexFile,
  );

  try {
    return await import(pathToFileURL(viteNodePath).href);
  } catch (error) {
    // Vite 8 and rolldown-vite depend on rolldown, so a missing
    // `@rolldown/binding-*` binary fails here while loading Vite itself.
    if (isMissingNativeBindingError(error)) {
      throw await missingNativeBindingError(error, root);
    }

    throw error;
  }
}

export function importLocal<T>(packageName: string, path: string): Promise<T> {
  const realPath = require.resolve(
    packageName,
    process.env.SHOPIFY_UNIT_TEST ? undefined : {paths: [path]},
  );

  return (import(pathToFileURL(realPath).href) as Promise<T>).catch(
    async (error: unknown) => {
      if (isMissingNativeBindingError(error)) {
        throw await missingNativeBindingError(error, path);
      }

      throw error;
    },
  );
}
