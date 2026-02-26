import {test} from './index';
import path from 'node:path';
import {DevServer} from './server';
import {stat, mkdir, rm, cp} from 'node:fs/promises';
import {exec} from 'node:child_process';
import {promisify} from 'node:util';

const execAsync = promisify(exec);

export type RecipeFixtureOptions = {
  recipeName: string;
  storeKey?: 'hydrogenPreviewStorefront' | `https://${string}`;
  useCache?: boolean;
};

export const setRecipeFixture = async (options: RecipeFixtureOptions) => {
  const {
    recipeName,
    storeKey = 'hydrogenPreviewStorefront',
    useCache = true,
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
};

const generateFixture = async ({
  recipeName,
  recipeFixturePath,
  skeletonPath,
  repoRoot,
}: GenerateOptions) => {
  await mkdir(path.dirname(recipeFixturePath), {recursive: true});

  // apply mutates templates/skeleton in-place; always revert it afterward
  // so tests that depend on the pristine skeleton aren't affected.
  try {
    await execAsync(
      `npm run cookbook --workspace=cookbook -- apply --recipe ${recipeName}`,
      {cwd: repoRoot, env: {...process.env, CI: 'true'}},
    );
    await cp(skeletonPath, recipeFixturePath, {recursive: true});
  } finally {
    await execAsync('git restore templates/skeleton', {cwd: repoRoot});
    await execAsync('git clean -fd templates/skeleton', {cwd: repoRoot});
  }

  await execAsync('npm install', {cwd: recipeFixturePath});
  await execAsync('npm run build', {cwd: recipeFixturePath});
  console.log(`[recipe-fixture] Generated ${recipeName} fixture`);
};
