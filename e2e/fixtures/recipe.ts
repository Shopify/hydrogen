import {test, configureDevServer} from './index';
import path from 'node:path';
import {
  stat,
  mkdir,
  rename,
  rm,
  cp,
  readFile,
  writeFile,
  access,
} from 'node:fs/promises';
import {exec, execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {parse as parseYaml} from 'yaml';
import type {MswScenario} from './msw/scenarios';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const LOCK_POLL_INTERVAL_MS = 500;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const COOKBOOK_APPLY_TIMEOUT_IN_MS = 2 * 60 * 1000;
const PNPM_INSTALL_TIMEOUT_IN_MS = 3 * 60 * 1000;

type WorkspaceConfig = {
  packages: string[];
  catalog: Record<string, string>;
};

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
  /**
   * MSW mock configuration for intercepting API calls (e.g. Customer Account API).
   * Storefront API calls still reach the real store.
   */
  mock?: {
    scenario: MswScenario;
  };
};

export const setRecipeFixture = (options: RecipeFixtureOptions) => {
  const {
    recipeName,
    storeKey = 'hydrogenPreviewStorefront',
    useCache = true,
    envOverrides = {},
    mock,
  } = options;

  const isLocal = !storeKey.startsWith('https://');
  const tmpRoot = path.resolve(__dirname, '../../.tmp/recipe-fixtures');
  // Each recipe fixture directory is owned by exactly one test file's beforeAll.
  // Two test files MUST NOT share the same recipeName — doing so would cause
  // parallel workers to race on the same directory. Enforced by convention:
  // each recipe has its own dedicated spec file.
  const recipeFixturePath = path.join(tmpRoot, recipeName);
  const skeletonPath = path.resolve(__dirname, '../../templates/skeleton');
  const repoRoot = path.resolve(__dirname, '../..');

  // Register fixture generation BEFORE server lifecycle — Playwright runs
  // beforeAll hooks in registration order, so the fixture directory exists
  // before configureDevServer's beforeAll tries to serve from it.
  if (isLocal) {
    test.beforeAll(async () => {
      await ensureFixture({
        recipeName,
        recipeFixturePath,
        skeletonPath,
        repoRoot,
        envOverrides,
        useCache,
      });
    });
  }

  configureDevServer({
    storeKey,
    projectPath: isLocal ? recipeFixturePath : undefined,
    mock,
  });
};

type GenerateOptions = {
  recipeName: string;
  recipeFixturePath: string;
  skeletonPath: string;
  repoRoot: string;
  envOverrides: Record<string, string>;
};

type EnsureFixtureOptions = GenerateOptions & {useCache: boolean};

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await stat(targetPath);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    return false;
  }
};

const acquireLock = async (lockPath: string): Promise<boolean> => {
  try {
    await writeFile(lockPath, process.pid.toString(), {flag: 'wx'});
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    return false;
  }
};

const waitForFixture = async (
  fixturePath: string,
  lockPath: string,
): Promise<void> => {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise<void>((resolve) =>
      setTimeout(resolve, LOCK_POLL_INTERVAL_MS),
    );
    if (await pathExists(lockPath)) continue;
    if (await pathExists(fixturePath)) return;
    throw new Error(
      `[recipe-fixture] Fixture at ${fixturePath} missing after lock released — generator may have failed`,
    );
  }
  throw new Error(
    `[recipe-fixture] Timed out waiting for fixture at ${fixturePath}`,
  );
};

const ensureFixture = async ({
  recipeName,
  recipeFixturePath,
  useCache,
  ...generateOptions
}: EnsureFixtureOptions): Promise<void> => {
  if (useCache && (await pathExists(recipeFixturePath))) {
    console.log(
      `[recipe-fixture] Using cached ${recipeName} fixture from ${recipeFixturePath}`,
    );
    return;
  }

  await mkdir(path.dirname(recipeFixturePath), {recursive: true});

  const lockPath = `${recipeFixturePath}.lock`;
  const isGenerator = await acquireLock(lockPath);

  if (!isGenerator) {
    console.log(
      `[recipe-fixture] Waiting for another worker to generate ${recipeName} fixture...`,
    );
    await waitForFixture(recipeFixturePath, lockPath);
    return;
  }

  try {
    // Re-check after acquiring lock — another worker may have just generated it
    if (useCache && (await pathExists(recipeFixturePath))) {
      console.log(
        `[recipe-fixture] Using cached ${recipeName} fixture from ${recipeFixturePath}`,
      );
      return;
    }

    await rm(recipeFixturePath, {recursive: true, force: true});
    await rm(`${recipeFixturePath}.tmp`, {recursive: true, force: true});

    await generateFixture({recipeName, recipeFixturePath, ...generateOptions});
  } finally {
    await rm(lockPath, {force: true});
  }
};

const generateFixture = async ({
  recipeName,
  recipeFixturePath,
  skeletonPath,
  repoRoot,
  envOverrides,
}: GenerateOptions) => {
  // Build into a staging directory so recipeFixturePath only exists once
  // generation is fully complete. This prevents parallel workers from seeing
  // pathExists(recipeFixturePath) === true on a partially-built fixture.
  const stagingPath = `${recipeFixturePath}.tmp`;
  await mkdir(path.dirname(recipeFixturePath), {recursive: true});
  await rm(stagingPath, {recursive: true, force: true});

  try {
    console.log(`[recipe-fixture] Copying skeleton to fixture directory...`);
    await cp(skeletonPath, stagingPath, {recursive: true});

    console.log(`[recipe-fixture] Applying ${recipeName} recipe...`);
    // Note: recipeName comes from test file literals (not user input), and
    // recipeFixturePath is constructed from controlled paths. Safe for test environment.
    // Using exec (not execFile) because npm run requires shell for script resolution.
    await execAsync(
      `npm run cookbook --workspace=cookbook -- apply --recipe ${recipeName} --template ${stagingPath}`,
      {
        cwd: repoRoot,
        env: {...process.env, ...envOverrides, CI: 'true'},
        timeout: COOKBOOK_APPLY_TIMEOUT_IN_MS,
      },
    );
  } catch (error) {
    console.error(
      `[recipe-fixture] Failed to apply recipe ${recipeName}:`,
      error,
    );
    throw error;
  }

  try {
    console.log(`[recipe-fixture] Resolving workspace protocols...`);
    await resolveWorkspaceProtocols(stagingPath, repoRoot);

    console.log(`[recipe-fixture] Installing dependencies...`);
    await execFileAsync('pnpm', ['install'], {
      cwd: stagingPath,
      timeout: PNPM_INSTALL_TIMEOUT_IN_MS,
    });

    await rename(stagingPath, recipeFixturePath);
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
 *
 * Note: only `workspace:*` is handled — `workspace:^` and `workspace:~` are not.
 * The skeleton template uses only `workspace:*`, so this is sufficient for now.
 * Recipe authors must not use other workspace range specifiers.
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

  const {catalog} = await getWorkspaceConfig(repoRoot);
  const packageMap = await getWorkspacePackageMap(repoRoot);

  // Resolve dependencies
  if (pkgJson.dependencies) {
    for (const [depName, depVersion] of Object.entries(pkgJson.dependencies)) {
      if (depVersion === 'workspace:*') {
        pkgJson.dependencies[depName] = resolveWorkspacePackage(
          depName,
          packageMap,
        );
      } else if (depVersion === 'catalog:') {
        pkgJson.dependencies[depName] = resolveCatalogVersion(depName, catalog);
      } else if (depVersion.startsWith('workspace:')) {
        throw new Error(
          `Unsupported workspace specifier "${depVersion}" for dependency "${depName}". Only "workspace:*" is supported.`,
        );
      }
    }
  }

  // Resolve devDependencies
  if (pkgJson.devDependencies) {
    for (const [depName, depVersion] of Object.entries(
      pkgJson.devDependencies,
    )) {
      if (depVersion === 'workspace:*') {
        pkgJson.devDependencies[depName] = resolveWorkspacePackage(
          depName,
          packageMap,
        );
      } else if (depVersion === 'catalog:') {
        pkgJson.devDependencies[depName] = resolveCatalogVersion(
          depName,
          catalog,
        );
      } else if (depVersion.startsWith('workspace:')) {
        throw new Error(
          `Unsupported workspace specifier "${depVersion}" for devDependency "${depName}". Only "workspace:*" is supported.`,
        );
      }
    }
  }

  await writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
};

const getWorkspaceConfig = async (
  repoRoot: string,
): Promise<WorkspaceConfig> => {
  const workspacePath = path.join(repoRoot, 'pnpm-workspace.yaml');
  const workspaceContent = await readFile(workspacePath, 'utf-8');
  const parsed = parseYaml(workspaceContent) as {
    packages?: unknown;
    catalog?: unknown;
  };

  const packages = Array.isArray(parsed.packages)
    ? parsed.packages.filter(
        (value): value is string => typeof value === 'string',
      )
    : [];

  const catalogEntries =
    parsed.catalog && typeof parsed.catalog === 'object' ? parsed.catalog : {};
  const catalog = Object.fromEntries(
    Object.entries(catalogEntries).filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === 'string' && typeof entry[1] === 'string',
    ),
  );

  return {packages, catalog};
};

const resolveCatalogVersion = (
  dependencyName: string,
  catalog: Record<string, string>,
) => {
  const resolvedVersion = catalog[dependencyName];

  if (!resolvedVersion) {
    throw new Error(
      `Missing catalog entry for ${dependencyName} in pnpm-workspace.yaml catalog`,
    );
  }

  return resolvedVersion;
};

const getWorkspacePackageMap = async (
  repoRoot: string,
): Promise<Map<string, string>> => {
  const {packages: packagePaths} = await getWorkspaceConfig(repoRoot);
  const packageMap = new Map<string, string>();

  await Promise.all(
    packagePaths.map(async (packagePath) => {
      const packageJsonPath = path.join(repoRoot, packagePath, 'package.json');

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
};

const resolveWorkspacePackage = (
  packageName: string,
  packageMap: Map<string, string>,
): string => {
  const packagePath = packageMap.get(packageName);

  if (!packagePath) {
    const knownPackages = [...packageMap.keys()].sort().join(', ');
    throw new Error(
      `Unknown workspace package: ${packageName}. Known workspace packages: ${knownPackages}`,
    );
  }

  return `file:${packagePath}`;
};
