import {execSync} from 'child_process';
import {createHash} from 'crypto';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import {
  COOKBOOK_PATH,
  REPO_ROOT,
  TEMPLATE_DIRECTORY,
  TEMPLATE_PATH,
} from './constants';
import {Ingredient, loadRecipe, Recipe, Step} from './recipe';
import {
  createDirectoryIfNotExists,
  getMainCommitHash,
  isInGitHistory,
  parseGitStatus,
  parseReferenceBranch,
  RecipeManifestFormat,
  recreateDirectory,
} from './util';

/**
 * Generate a recipe.
 * @param params - The parameters for the recipe.
 * @returns The path to the recipe.
 */
export async function generateRecipe(params: {
  recipeName: string;
  filenamesToIgnore: string[];
  onlyFiles: boolean;
  referenceBranch: string;
  recipeManifestFormat: RecipeManifestFormat;
}): Promise<string> {
  const {recipeName, filenamesToIgnore, referenceBranch, recipeManifestFormat} =
    params;

  console.log('📖 Generating recipe');

  // create the recipe directory if it doesn't exist
  const recipeDirPath = path.join(COOKBOOK_PATH, 'recipes', recipeName);
  createDirectoryIfNotExists(recipeDirPath);

  // load the existing recipe if it exists
  const existingRecipe = maybeLoadExistingRecipe(recipeDirPath);

  // clean up the ingredients directory
  const ingredientsDirPath = path.join(recipeDirPath, 'ingredients');
  recreateDirectory(ingredientsDirPath);

  // clean up the patches directory
  const patchesDirPath = path.join(recipeDirPath, 'patches');
  recreateDirectory(patchesDirPath);

  // rewind changes to the recipe directory (if the recipe directory is not new)
  if (existingRecipe != null && isInGitHistory({path: recipeDirPath})) {
    execSync(`git checkout -- ${recipeDirPath}`);
  }

  // parse the git status for the template directory
  const {modifiedFiles, newFiles, deletedFiles} = parseGitStatus({
    filenamesToIgnore,
  });

  // parse the new files into ingredients
  const ingredients: Ingredient[] = newFiles.map((file): Ingredient => {
    const existingDescription = existingRecipe?.ingredients.find(
      (ingredient) => ingredient.path === file,
    )?.description;

    return {
      path: file,
      description: existingDescription ?? null,
    };
  });

  // Copy over the new files to the recipe directory. If those files are nested, copy the directory structure over.
  for (const file of newFiles) {
    const relativePath = path.join(ingredientsDirPath, file);
    const dirs = path.dirname(relativePath);
    fs.mkdirSync(dirs, {recursive: true});
    fs.copyFileSync(path.join(REPO_ROOT, file), relativePath);
  }

  // parse the modified files into steps
  const steps = await generateSteps({
    modifiedFiles,
    patchesDirPath,
    existingRecipe,
    ingredients,
  });

  const recipe: Recipe = {
    title: existingRecipe?.title ?? recipeName,
    image: existingRecipe?.image ?? null,
    description: existingRecipe?.description ?? '',
    notes: existingRecipe?.notes ?? [],
    deletedFiles,
    ingredients,
    steps,
    commit: getMainCommitHash(parseReferenceBranch(referenceBranch)),
  };

  // Write the recipe manifest
  const recipeManifestPath =
    recipeManifestFormat === 'json'
      ? path.join(recipeDirPath, 'recipe.json')
      : path.join(recipeDirPath, 'recipe.yaml');

  const data =
    recipeManifestFormat === 'json'
      ? JSON.stringify(recipe, null, 2)
      : `# yaml-language-server: $schema=../../recipe.schema.json\n\n` +
        YAML.stringify(recipe);

  fs.writeFileSync(recipeManifestPath, data);

  return recipeManifestPath;
}

async function generateSteps(params: {
  modifiedFiles: string[];
  patchesDirPath: string;
  existingRecipe: Recipe | null;
  ingredients: Ingredient[];
}): Promise<Step[]> {
  const existingInfoSteps =
    params.existingRecipe?.steps.filter((step) => step.type === 'INFO') ?? [];

  let patchSteps: Step[] = [];

  const modifiedFiles = params.modifiedFiles.filter((file) => {
    // ignore generated types files
    return !file.endsWith('.d.ts');
  });

  for await (const file of modifiedFiles) {
    const {fullPath, patchFilename} = createPatchFile({
      file,
      patchesDirPath: params.patchesDirPath,
    });

    const existingStep = params.existingRecipe?.steps.find(
      (step) =>
        step.diffs != null &&
        step.diffs.length === 1 &&
        step.diffs[0].file === fullPath.replace(TEMPLATE_PATH, ''),
    );

    // Try to find the existing description for the step which has _only_ this file as a diff patch.
    const existingDescription = existingStep?.description ?? null;

    const step: Step = {
      type: 'PATCH',
      name: existingStep?.name ?? file.replace(TEMPLATE_DIRECTORY, ''),
      description: existingDescription ?? null,
      diffs: [
        {
          file: fullPath.replace(TEMPLATE_PATH, ''),
          patchFile: patchFilename,
        },
      ],
    };
    patchSteps.push(step);
  }

  // add the copy ingredients step if there are ingredients
  const maybeCopyIngredientsStep: Step[] =
    params.ingredients.length > 0
      ? [copyIngredientsStep(params.ingredients)]
      : [];

  return [...existingInfoSteps, ...maybeCopyIngredientsStep, ...patchSteps];
}

function maybeLoadExistingRecipe(recipePath: string): Recipe | null {
  try {
    return loadRecipe({directory: recipePath});
  } catch (error) {
    return null;
  }
}

function copyIngredientsStep(ingredients: Ingredient[]): Step {
  return {
    type: 'COPY_INGREDIENTS',
    name: 'Copy ingredients',
    description:
      'Copy the ingredients from the template directory to the current directory.',
    ingredients: ingredients.map((ingredient) => ingredient.path),
  };
}

function createPatchFile(params: {file: string; patchesDirPath: string}): {
  fullPath: string;
  patchFilename: string;
} {
  const {file, patchesDirPath} = params;
  const fullPath = path.join(REPO_ROOT, file);

  // get the diff of the file, keeping only the patch
  const diff = execSync(`git diff '${fullPath}'`, {
    encoding: 'utf-8',
  });
  // remove the diff header
  const changes = diff.toString().split('\n').slice(1).join('\n');

  const sha = createHash('sha256').update(fullPath).digest('hex');
  const patchFilename = `${path.basename(fullPath)}.${sha.slice(0, 6)}.patch`;
  const patchFilePath = path.join(patchesDirPath, patchFilename);
  fs.writeFileSync(patchFilePath, changes);
  return {fullPath, patchFilename};
}
