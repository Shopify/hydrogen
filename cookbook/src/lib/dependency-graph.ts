import path from 'path';
import {COOKBOOK_PATH, TEMPLATE_DIRECTORY} from './constants';
import {loadRecipe} from './recipe';
import {listRecipes} from './util';

/**
 * Collect all repo-relative skeleton file paths referenced by a single recipe
 * (diffs and ingredients; deleted files are intentionally excluded).
 */
function getFilesForRecipe(recipe: {
  steps: Array<{diffs?: Array<{file: string}>}>;
  ingredients: Array<{path: string}>;
}): Set<string> {
  const files = new Set<string>();

  for (const step of recipe.steps) {
    if (step.diffs) {
      for (const diff of step.diffs) {
        // Patch targets are stored relative to the template root (e.g. "app/root.tsx").
        // Normalise to repo-relative by prepending the template directory prefix.
        files.add(`${TEMPLATE_DIRECTORY}${diff.file}`);
      }
    }
  }

  // Ingredient paths are already repo-relative (e.g. "templates/skeleton/app/routes/…")
  for (const ingredient of recipe.ingredients) {
    files.add(ingredient.path);
  }

  return files;
}

/**
 * Collect all skeleton files referenced by the given recipes (or all recipes
 * if none specified) and map each file to the recipes that touch it.
 * Returns a Map sorted by file path, e.g.:
 *   "templates/skeleton/app/root.tsx" → ["b2b", "multipass"]
 */
export function getSkeletonFileMap(
  recipeNames?: string[],
): Map<string, string[]> {
  const names = recipeNames ?? listRecipes();
  const fileMap = new Map<string, string[]>();

  const addFile = (file: string, recipeName: string) => {
    const recipes = fileMap.get(file) ?? [];
    recipes.push(recipeName);
    fileMap.set(file, recipes);
  };

  for (const recipeName of names) {
    const recipeDir = path.join(COOKBOOK_PATH, 'recipes', recipeName);
    let recipe;
    try {
      recipe = loadRecipe({directory: recipeDir});
    } catch (e) {
      console.warn(
        `Warning: could not load recipe "${recipeName}": ${e instanceof Error ? e.message : e}`,
      );
      continue;
    }

    getFilesForRecipe(recipe).forEach((file) => addFile(file, recipeName));
  }

  return new Map(
    Array.from(fileMap.entries()).sort((a, b) => a[0].localeCompare(b[0])),
  );
}

/**
 * Given a list of changed skeleton file paths (repo-relative, e.g.
 * "templates/skeleton/app/root.tsx"), return the names of recipes that
 * reference any of those files.
 */
export function getAffectedRecipes(changedFiles: string[]): string[] {
  if (changedFiles.length === 0) return [];

  const recipes = listRecipes();
  const affected: string[] = [];

  for (const recipeName of recipes) {
    const recipeDir = path.join(COOKBOOK_PATH, 'recipes', recipeName);
    let recipe;
    try {
      recipe = loadRecipe({directory: recipeDir});
    } catch (e) {
      console.warn(
        `Warning: could not load recipe "${recipeName}": ${e instanceof Error ? e.message : e}`,
      );
      continue;
    }

    const recipeFiles = getFilesForRecipe(recipe);
    if (changedFiles.some((f) => recipeFiles.has(f))) {
      affected.push(recipeName);
    }
  }

  return affected;
}
