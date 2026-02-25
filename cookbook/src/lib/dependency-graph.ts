import path from 'path';
import {COOKBOOK_PATH, TEMPLATE_DIRECTORY} from './constants';
import {loadRecipe} from './recipe';
import {listRecipes} from './util';

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
    } catch {
      continue;
    }

    // Patch targets are stored relative to the template root (e.g. "app/root.tsx").
    // Normalise to repo-relative by prepending the template directory prefix.
    for (const step of recipe.steps) {
      if (step.diffs) {
        for (const diff of step.diffs) {
          addFile(`${TEMPLATE_DIRECTORY}${diff.file}`, recipeName);
        }
      }
    }

    // Ingredient paths are already repo-relative (e.g. "templates/skeleton/app/routes/…")
    for (const ingredient of recipe.ingredients) {
      addFile(ingredient.path, recipeName);
    }
  }

  return new Map(
    Array.from(fileMap.entries()).sort((a, b) => a[0].localeCompare(b[0])),
  );
}

/**
 * Collect all repo-relative skeleton file paths referenced by the given
 * recipes (or all recipes if none specified). Returns a sorted, deduplicated
 * list, e.g. ["templates/skeleton/app/root.tsx", …].
 */
export function getSkeletonFiles(recipeNames?: string[]): string[] {
  return Array.from(getSkeletonFileMap(recipeNames).keys()) as string[];
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
    } catch {
      // Skip recipes that fail to parse
      continue;
    }

    const recipeFiles = new Set<string>();

    for (const step of recipe.steps) {
      if (step.diffs) {
        for (const diff of step.diffs) {
          recipeFiles.add(`${TEMPLATE_DIRECTORY}${diff.file}`);
        }
      }
    }

    for (const ingredient of recipe.ingredients) {
      recipeFiles.add(ingredient.path);
    }

    const isAffected = changedFiles.some((f) => recipeFiles.has(f));
    if (isAffected) {
      affected.push(recipeName);
    }
  }

  return affected;
}
