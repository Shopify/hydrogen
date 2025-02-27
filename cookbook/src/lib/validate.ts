import {execSync} from 'child_process';
import fs from 'fs';
import {applyRecipe} from './apply';
import {TEMPLATE_PATH} from './constants';
import {makeRandomTempDir} from './util';
/**
 * Validate a recipe.
 * @param params - The parameters for the validation.
 */
export function validateRecipe(params: {recipeTitle: string}) {
  let start = Date.now();

  const {recipeTitle} = params;
  const tempDir = makeRandomTempDir({prefix: 'validate-recipe'});

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

  // run npm install in the template directory
  console.log(`- 📦 Installing dependencies…`);
  execSync(`npm install`, {cwd: tempDir});

  // run typecheck in the template directory
  console.log(`- 🔨 Running typecheck…`);
  execSync(`npm run typecheck`, {cwd: tempDir});

  // run npm run build in the template directory
  console.log(`- 🏗️ Building…`);
  execSync(`npm run build`, {cwd: tempDir});

  const duration = Date.now() - start;
  console.log(`✅ Recipe '${recipeTitle}' is valid (${duration}ms)`);
}
