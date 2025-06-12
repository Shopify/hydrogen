import {execSync} from 'child_process';
import fs, {rmSync} from 'fs';
import {applyRecipe} from './apply';
import {TEMPLATE_PATH} from './constants';
import {makeRandomTempDir} from './util';
import path from 'path';
/**
 * Validate a recipe.
 * @param params - The parameters for the validation.
 */
export function validateRecipe(params: {
  recipeTitle: string;
  hydrogenPackagesVersion?: string;
}) {
  let start = Date.now();

  const {recipeTitle, hydrogenPackagesVersion} = params;
  const tempDir = makeRandomTempDir({prefix: 'validate-recipe'});
  try {
    console.log(`- 🧑‍🍳 Applying recipe '${recipeTitle}'`);
    applyRecipe({
      recipeTitle,
    });

    // copy the skeleton template to a temporary directory, except for the node_modules directory and its contents
    fs.cpSync(TEMPLATE_PATH, tempDir, {
      recursive: true,
      filter: (src) => {
        return !src.includes('node_modules');
      },
    });

    if (hydrogenPackagesVersion != null) {
      console.log(`- 🔼 Applying Hydrogen version ${hydrogenPackagesVersion}…`);
      rmSync(path.join(tempDir, 'package-lock.json'), {force: true});
      const packages = [
        'https://registry.npmjs.org/@shopify/cli-hydrogen/-/cli-hydrogen',
        'https://registry.npmjs.org/@shopify/hydrogen/-/hydrogen',
        'https://registry.npmjs.org/@shopify/remix-oxygen/-/remix-oxygen',
      ];
      execSync(
        `npm install ${packages.map((p) => `${p}-${hydrogenPackagesVersion}.tgz`).join(' ')}`,
        {cwd: tempDir},
      );
    }

    // run npm install in the template directory
    console.log(`- 📦 Installing dependencies…`);
    execSync(`npm install`, {cwd: tempDir});

    console.log(`- 🔄 Running codegen…`);
    execSync(`npm run codegen`, {cwd: tempDir});

    // run typecheck in the template directory
    console.log(`- 🔨 Running typecheck…`);
    execSync(`npm run typecheck`, {cwd: tempDir});

    // run npm run build in the template directory
    console.log(`- 🏗️ Building…`);
    execSync(`npm run build`, {cwd: tempDir});

    const duration = Date.now() - start;
    console.log(`✅ Recipe '${recipeTitle}' is valid (${duration}ms)`);
  } finally {
    // cleanup the temp folder
    fs.rmSync(tempDir, {recursive: true});
  }
}
