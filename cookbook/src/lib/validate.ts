import {execSync} from 'child_process';
import {rmSync} from 'fs';
import {applyRecipe} from './apply';
import {TEMPLATE_PATH} from './constants';
import path from 'path';
/**
 * Validate a recipe.
 * @param params - The parameters for the validation.
 */
export async function validateRecipe(params: {
  recipeTitle: string;
  hydrogenPackagesVersion?: string;
}) {
  let start = Date.now();

  const {recipeTitle, hydrogenPackagesVersion} = params;

  try {
    console.log(`- 🧑‍🍳 Applying recipe '${recipeTitle}'`);
    applyRecipe({
      recipeTitle,
    });

    if (hydrogenPackagesVersion != null) {
      console.log(`- 🔼 Applying Hydrogen version ${hydrogenPackagesVersion}…`);
      rmSync(path.join(TEMPLATE_PATH, 'package-lock.json'), {force: true});
      const packages = [
        'https://registry.npmjs.org/@shopify/cli-hydrogen/-/cli-hydrogen',
        'https://registry.npmjs.org/@shopify/hydrogen/-/hydrogen',
        'https://registry.npmjs.org/@shopify/remix-oxygen/-/remix-oxygen',
      ];
      execSync(
        `npm install ${packages.map((p) => `${p}-${hydrogenPackagesVersion}.tgz`).join(' ')}`,
        {cwd: TEMPLATE_PATH},
      );
    }

    // run npm install in the template directory
    console.log(`- 📦 Installing dependencies…`);
    execSync(`npm install`, {cwd: TEMPLATE_PATH});

    console.log(`- 🔄 Running codegen…`);
    execSync(`npm run codegen`, {cwd: TEMPLATE_PATH});
    await wait(1000);

    // run typecheck in the template directory
    console.log(`- 🔨 Running typecheck…`);
    execSync(`npm run typecheck`, {cwd: TEMPLATE_PATH});

    // run npm run build in the template directory
    console.log(`- 🏗️ Building…`);
    execSync(`npm run build`, {cwd: TEMPLATE_PATH});

    const duration = Date.now() - start;
    console.log(`✅ Recipe '${recipeTitle}' is valid (${duration}ms)`);

    return true;
  } catch (error) {
    console.error(error);
    return false;
  } finally {
    // rewind the changes to the template directory
    execSync(`git checkout -- .`, {cwd: TEMPLATE_PATH});
    // wait a bit to make sure the changes are reverted
    await wait(1000);
  }
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
