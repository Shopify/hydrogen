import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  COOKBOOK_PATH,
  REPO_ROOT,
  TEMPLATE_DIRECTORY,
  TEMPLATE_PATH,
} from './constants';
import {loadRecipe} from './recipe';
import {parseGitStatus} from './util';

/**
 * Apply a recipe to the current project.
 * @param params - The parameters for the recipe.
 */
export function applyRecipe(params: {
  recipeTitle: string;
  noCopyIngredients?: boolean;
}): void {
  const recipeDir = path.join(COOKBOOK_PATH, 'recipes', params.recipeTitle);

  // load the recipe.json file
  console.log(`- 🍱 Loading recipe '${params.recipeTitle}'…`);
  const recipe = loadRecipe({directory: recipeDir});

  // list the ingredients in the recipe's ingredients folder as a list of flat paths (e.g. foo/bar/baz.txt)
  const ingredientsPath = path.join(recipeDir, 'ingredients');
  const fsIngredients = fs
    .readdirSync(ingredientsPath, {recursive: true, withFileTypes: true})
    .filter((ingredient) => ingredient.isFile())
    .map((ingredient) =>
      path
        .join(ingredient.path, ingredient.name)
        .replace(path.join(recipeDir, 'ingredients') + '/', ''),
    );

  // if the template directory contains modified files, exit with an error
  console.log(`- 🔄 Checking template directory…`);
  const status = parseGitStatus({filenamesToIgnore: []});
  if (
    status.modifiedFiles.filter(
      (f) => !['package.json', 'package-lock.json'].includes(f),
    ).length > 0
  ) {
    throw new Error('Template folder has uncommitted changes.');
  }

  // check that each ingredient in the recipe is present in the ingredients folder
  console.log(`- 🍣 Checking ingredients…`);
  // filter out public ingredients as they might contain assets we don't need to cross-check
  const nonPublicFSIngredients = fsIngredients.filter(
    (ingredient) =>
      !ingredient.startsWith(path.join(TEMPLATE_DIRECTORY, 'public/')),
  );
  const nonPublicRecipeIngredients = recipe.ingredients.filter(
    (i) => !i.path.startsWith(path.join(TEMPLATE_DIRECTORY, 'public/')),
  );
  if (
    nonPublicFSIngredients.length !== nonPublicRecipeIngredients.length ||
    !nonPublicFSIngredients.every((ingredient) =>
      nonPublicRecipeIngredients.some((i) => i.path === ingredient),
    )
  ) {
    console.error(nonPublicFSIngredients);
    console.error(nonPublicRecipeIngredients);
    throw new Error('Ingredients do not match.');
  }

  // delete every file in the deletedFiles array
  console.log(`- 🗑️ Deleting files…`);
  for (const file of recipe.deletedFiles ?? []) {
    console.log('  - Deleting', file);
    fs.unlinkSync(path.join(REPO_ROOT, file));
  }

  // copy over every ingredient to the template directory
  console.log(`- 🗳️ Copying ingredients…`);
  if (!params.noCopyIngredients) {
    for (const ingredient of fsIngredients) {
      const dir = path.dirname(
        path.join(TEMPLATE_PATH, ingredient.replace(TEMPLATE_DIRECTORY, '')),
      );
      const src = path.join(recipeDir, 'ingredients', ingredient);
      const dst = path.join(dir, path.basename(ingredient));
      console.log('  - Copying', path.basename(src));
      fs.mkdirSync(dir, {recursive: true});
      fs.copyFileSync(src, dst);
    }
  }

  // apply the patches to the template directory
  console.log(`- 🥣 Applying steps…`);
  for (let i = 0; i < recipe.steps.length; i++) {
    const step = recipe.steps[i];
    if (step.diffs == null || step.diffs.length === 0) {
      continue;
    }

    for (const diff of step.diffs) {
      console.log(`  - 🩹 Patching ${diff.file} with ${diff.patchFile}…`);
      const patchPath = path.join(recipeDir, 'patches', diff.patchFile);
      const destPath = path.join(TEMPLATE_PATH, diff.file);
      execSync(`patch '${destPath}' '${patchPath}'`, {stdio: 'inherit'});
    }
  }
}
