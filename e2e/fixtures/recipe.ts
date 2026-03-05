import {test} from './index';
import path from 'node:path';
import {DevServer} from './server';
import {
  stat,
  mkdir,
  rm,
  cp,
  readFile,
  writeFile,
  access,
} from 'node:fs/promises';
import {exec} from 'node:child_process';
import {promisify} from 'node:util';

const execAsync = promisify(exec);
let workspacePackageMapPromise: Promise<Map<string, string>> | null = null;

export type RecipeFixtureOptions = {
  /**
   * The name of the recipe to test (must match a recipe directory in cookbook/recipes/)
   */
  recipeName: string;
  /**
   * The test store to use. Can be a local store key or a remote URL.
   * @default 'hydrogenPreviewStorefront'
   */
  storeKey?: 'hydrogenPreviewStorefront' | `https://${string}`;
  /**
   * Whether to reuse cached recipe fixtures. Set to false to force regeneration.
   * Useful when recipe changes haven't been committed yet.
   * @default true
   */
  useCache?: boolean;
  /**
   * Custom environment variables to pass to the recipe application process.
   * These override any defaults but don't override the test store env file.
   */
  envOverrides?: Record<string, string>;
};

export const setRecipeFixture = (options: RecipeFixtureOptions) => {
  const {
    recipeName,
    storeKey = 'hydrogenPreviewStorefront',
    useCache = true,
    envOverrides = {},
  } = options;

  const isLocal = !storeKey.startsWith('https://');
  let server: DevServer | null = null;
  const tmpRoot = path.resolve(__dirname, '../../.tmp/recipe-fixtures');
  const recipeFixturePath = path.join(tmpRoot, recipeName);
  const skeletonPath = path.resolve(__dirname, '../../templates/skeleton');
  const repoRoot = path.resolve(__dirname, '../..');

  test.use({
    baseURL: async ({}, use) => {
      await use(isLocal ? server?.getUrl() : storeKey);
    },
  });

  if (!isLocal) {
    return;
  }

  test.afterAll(async () => {
    await server?.stop();
  });

  test.beforeAll(async ({}) => {
    const envPath = path.resolve(__dirname, `../envs/.env.${storeKey}`);
    await stat(envPath);

    let fixtureExists = false;
    try {
      await stat(recipeFixturePath);
      fixtureExists = true;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }

    if (fixtureExists && useCache) {
      console.log(
        `[recipe-fixture] Using cached ${recipeName} fixture from ${recipeFixturePath}`,
      );
    } else {
      if (fixtureExists) {
        await rm(recipeFixturePath, {recursive: true, force: true});
      }
      await generateFixture({
        recipeName,
        recipeFixturePath,
        skeletonPath,
        repoRoot,
        envOverrides,
      });
    }

    server = new DevServer({
      storeKey,
      customerAccountPush: false,
      envFile: envPath,
      projectPath: recipeFixturePath,
    });

    await server.start();
  });
};

type GenerateOptions = {
  recipeName: string;
  recipeFixturePath: string;
  skeletonPath: string;
  repoRoot: string;
  envOverrides: Record<string, string>;
};

const generateFixture = async ({
  recipeName,
  recipeFixturePath,
  skeletonPath,
  repoRoot,
  envOverrides,
}: GenerateOptions) => {
  await mkdir(path.dirname(recipeFixturePath), {recursive: true});

  // apply mutates templates/skeleton in-place; always revert it afterward
  // so tests that depend on the pristine skeleton aren't affected.
  try {
    console.log(`[recipe-fixture] Applying ${recipeName} recipe...`);
    await execAsync(
      `npm run cookbook --workspace=cookbook -- apply --recipe ${recipeName}`,
      {cwd: repoRoot, env: {...process.env, ...envOverrides, CI: 'true'}},
    );
    console.log(`[recipe-fixture] Copying skeleton to fixture directory...`);
    await cp(skeletonPath, recipeFixturePath, {recursive: true});
  } catch (error) {
    console.error(
      `[recipe-fixture] Failed to apply recipe ${recipeName}:`,
      error,
    );
    throw error;
  } finally {
    // Always clean up the skeleton, even if the recipe application failed
    try {
      await execAsync('git restore templates/skeleton', {cwd: repoRoot});
      await execAsync('git clean -fd templates/skeleton', {cwd: repoRoot});
    } catch (cleanupError) {
      console.warn(
        '[recipe-fixture] Failed to clean up skeleton:',
        cleanupError,
      );
    }
  }

  try {
    console.log(`[recipe-fixture] Resolving workspace protocols...`);
    await resolveWorkspaceProtocols(recipeFixturePath, repoRoot);

    console.log(`[recipe-fixture] Installing dependencies...`);
    // Run pnpm install - workspace protocols are already resolved to file: paths
    await execAsync('pnpm install', {cwd: recipeFixturePath});
    console.log(
      `[recipe-fixture] Generated ${recipeName} fixture successfully`,
    );
  } catch (error) {
    console.error(`[recipe-fixture] Failed to install ${recipeName}:`, error);
    throw error;
  }
};

/**
 * Resolves workspace:* and catalog: protocols in package.json to actual versions
 * so the fixture can be installed independently without being part of the workspace.
 */
const resolveWorkspaceProtocols = async (
  fixturePath: string,
  repoRoot: string,
) => {
  const pkgJsonPath = path.join(fixturePath, 'package.json');
  const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf-8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  // Read catalog from pnpm-workspace.yaml for catalog: protocol resolution
  const workspacePath = path.join(repoRoot, 'pnpm-workspace.yaml');
  const workspaceContent = await readFile(workspacePath, 'utf-8');
  const catalog = parseCatalogFromWorkspace(workspaceContent);

  // Resolve dependencies
  if (pkgJson.dependencies) {
    for (const [depName, depVersion] of Object.entries(pkgJson.dependencies)) {
      if (depVersion === 'workspace:*') {
        pkgJson.dependencies[depName] = await resolveWorkspacePackage(
          depName,
          repoRoot,
        );
      } else if (depVersion === 'catalog:') {
        pkgJson.dependencies[depName] = catalog[depName];
      }
    }
  }

  // Resolve devDependencies
  if (pkgJson.devDependencies) {
    for (const [depName, depVersion] of Object.entries(
      pkgJson.devDependencies,
    )) {
      if (depVersion === 'workspace:*') {
        pkgJson.devDependencies[depName] = await resolveWorkspacePackage(
          depName,
          repoRoot,
        );
      } else if (depVersion === 'catalog:') {
        pkgJson.devDependencies[depName] = catalog[depName];
      }
    }
  }

  await writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
};

/**
 * Parses the catalog section from pnpm-workspace.yaml
 */
const parseCatalogFromWorkspace = (
  workspaceContent: string,
): Record<string, string> => {
  const lines = workspaceContent.split('\n');
  const catalog: Record<string, string> = {};
  let inCatalog = false;

  for (const line of lines) {
    if (line.trim() === 'catalog:') {
      inCatalog = true;
      continue;
    }

    if (inCatalog) {
      // Stop when we hit a non-indented line or empty line after catalog
      if (line && !line.startsWith(' ')) {
        break;
      }

      // Parse catalog entries like: "  '@types/node': '^22'"
      const match = line.match(/^\s+'?([^':]+)'?:\s+'?([^']+)'?/);
      if (match) {
        catalog[match[1]] = match[2];
      }
    }
  }

  return catalog;
};

const parseWorkspacePackagePaths = (workspaceContent: string): string[] => {
  const lines = workspaceContent.split('\n');
  const packagePaths: string[] = [];
  let inPackages = false;

  for (const line of lines) {
    if (line.trim() === 'packages:') {
      inPackages = true;
      continue;
    }

    if (inPackages) {
      if (line && !line.startsWith(' ')) {
        break;
      }

      const match = line.match(/^\s*-\s+['"]?([^'"]+)['"]?\s*$/);
      if (match) {
        packagePaths.push(match[1]);
      }
    }
  }

  return packagePaths;
};

const getWorkspacePackageMap = async (
  repoRoot: string,
): Promise<Map<string, string>> => {
  if (workspacePackageMapPromise) {
    return workspacePackageMapPromise;
  }

  workspacePackageMapPromise = (async () => {
    const workspacePath = path.join(repoRoot, 'pnpm-workspace.yaml');
    const workspaceContent = await readFile(workspacePath, 'utf-8');
    const packagePaths = parseWorkspacePackagePaths(workspaceContent);
    const packageMap = new Map<string, string>();

    await Promise.all(
      packagePaths.map(async (packagePath) => {
        const packageJsonPath = path.join(
          repoRoot,
          packagePath,
          'package.json',
        );

        try {
          await access(packageJsonPath);
        } catch {
          return;
        }

        const packageJson = JSON.parse(
          await readFile(packageJsonPath, 'utf-8'),
        ) as {
          name?: string;
        };

        if (!packageJson.name) {
          return;
        }

        packageMap.set(packageJson.name, path.join(repoRoot, packagePath));
      }),
    );

    return packageMap;
  })();

  return workspacePackageMapPromise;
};

/**
 * Resolves a workspace:* dependency to a file: protocol pointing to the built package
 */
const resolveWorkspacePackage = async (
  packageName: string,
  repoRoot: string,
): Promise<string> => {
  const packageMap = await getWorkspacePackageMap(repoRoot);
  const packagePath = packageMap.get(packageName);

  if (!packagePath) {
    const knownPackages = [...packageMap.keys()].sort().join(', ');
    throw new Error(
      `Unknown workspace package: ${packageName}. Known workspace packages: ${knownPackages}`,
    );
  }

  return `file:${packagePath}`;
};
