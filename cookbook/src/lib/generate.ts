import {execSync} from 'child_process';
import {createHash, randomUUID} from 'crypto';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import {
  COOKBOOK_PATH,
  REPO_ROOT,
  TEMPLATE_DIRECTORY,
  TEMPLATE_PATH,
} from './constants';
import {Ingredient, isSubstep, loadRecipe, Recipe, Step} from './recipe';
import {
  createDirectoryIfNotExists,
  getMainCommitHash,
  isInGitHistory,
  parseGitStatus,
  parseReferenceBranch,
  RecipeManifestFormat,
  recreateDirectory,
} from './util';
import {generateLLMsFiles} from './llms';

type GenerateRecipeParams = {
  recipeName: string;
  filenamesToIgnore: string[];
  onlyFiles: boolean;
  referenceBranch: string;
  recipeManifestFormat: RecipeManifestFormat;
  filePath?: string;
};

/**
 * Generate a recipe.
 * @param params - The parameters for the recipe.
 * @returns The path to the recipe.
 */
export async function generateRecipe(
  params: GenerateRecipeParams,
): Promise<string> {
  const {
    recipeName,
    filenamesToIgnore,
    referenceBranch,
    recipeManifestFormat,
    filePath,
  } = params;

  if (filePath != null) {
    return generateForSingleFile(params);
  }

  console.log('📖 Generating recipe');

  // create the recipe directory if it doesn't exist
  const recipeDirPath = path.join(COOKBOOK_PATH, 'recipes', recipeName);
  createDirectoryIfNotExists(recipeDirPath);

  // load the existing recipe if it exists
  const existingRecipe = maybeLoadExistingRecipe(recipeDirPath);

  // rewind changes to the recipe directory (if the recipe directory is not new)
  if (existingRecipe != null && isInGitHistory({path: recipeDirPath})) {
    execSync(`git checkout -- ${recipeDirPath}`);
  }

  // clean up the ingredients directory
  const ingredientsDirPath = path.join(recipeDirPath, 'ingredients');
  recreateDirectory(ingredientsDirPath);

  // clean up the patches directory
  const patchesDirPath = path.join(recipeDirPath, 'patches');
  recreateDirectory(patchesDirPath);

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

  const userQueries = existingRecipe?.llms.userQueries ?? [];
  const troubleshooting = existingRecipe?.llms.troubleshooting ?? [];

  const recipe: Recipe = {
    gid: existingRecipe?.gid ?? randomUUID(),
    title: existingRecipe?.title ?? recipeName,
    summary: existingRecipe?.summary ?? '',
    description: existingRecipe?.description ?? '',
    notes: existingRecipe?.notes ?? [],
    requirements: existingRecipe?.requirements ?? null,
    ingredients,
    deletedFiles,
    steps,
    nextSteps: existingRecipe?.nextSteps ?? null,
    llms: {userQueries, troubleshooting},
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
        YAML.stringify(recipe, {
          blockQuote: 'literal',
        });

  fs.writeFileSync(recipeManifestPath, data);

  console.log('- 📖 Generating LLMs files…');
  generateLLMsFiles(recipeName);

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

  function processModifiedFiles(): Step[] {
    let patchSteps: Step[] = [];
    const modifiedFiles = params.modifiedFiles.filter((file) => {
      // ignore generated types files (but not env.d.ts which contains manual changes)
      return !file.endsWith('.generated.d.ts') && 
             !file.endsWith('.generated.ts') &&
             !file.endsWith('storefrontapi.d.ts') &&
             !file.endsWith('customer-accountapi.d.ts');
    });
    let i = 0;
    for (const file of modifiedFiles) {
      i++;
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
        step: existingStep?.step ?? `${i}`,
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
    return patchSteps;
  }
  const patchSteps = processModifiedFiles();

  function processNewFiles(): Step[] {
    let newFileSteps: Step[] = [];

    let i = 0;
    for (const file of params.ingredients) {
      i++;

      const existingStep = params.existingRecipe?.steps.find(
        (step) =>
          step.type === 'NEW_FILE' &&
          step.ingredients?.length === 1 &&
          step.ingredients[0].path === file.path,
      );

      // Try to find the existing description for the step which has _only_ this file as a diff patch.
      const existingDescription = existingStep?.description ?? null;

      const step: Step = {
        type: 'NEW_FILE',
        step: existingStep?.step ?? `${i}`,
        name: existingStep?.name ?? file.path.replace(TEMPLATE_DIRECTORY, ''),
        description: existingDescription ?? file.description ?? null,
        ingredients: [
          {
            path: file.path,
            renamedFrom: existingStep?.ingredients?.[0]?.renamedFrom,
          },
        ],
      };
      newFileSteps.push(step);
    }
    return newFileSteps;
  }
  const newFileSteps = processNewFiles();

  const steps = [
    ...existingInfoSteps,
    ...[...patchSteps, ...newFileSteps],
  ].sort(compareSteps);

  return steps;
}

function compareSteps(a: Step, b: Step): number {
  function normalize(step: Step): string {
    const expanded = isSubstep(a) ? `${step.step}` : `${step.step}.0`;
    return expanded
      .split('.')
      .map((v) => parseInt(v, 10).toString().padStart(4, '0'))
      .join('.');
  }

  return normalize(a).localeCompare(normalize(b));
}

function maybeLoadExistingRecipe(recipePath: string): Recipe | null {
  try {
    return loadRecipe({directory: recipePath});
  } catch (error) {
    return null;
  }
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

export async function generateForSingleFile(
  params: GenerateRecipeParams,
): Promise<string> {
  const {recipeName, filePath: rawFilePath, recipeManifestFormat} = params;
  if (rawFilePath == null) {
    throw new Error('filePath is required');
  }

  const absoluteFilePath = path.resolve(rawFilePath);
  const filePathRelativeToRepo = path.relative(REPO_ROOT, absoluteFilePath);
  const filePathRelativeToTemplate = path.relative(
    TEMPLATE_PATH,
    absoluteFilePath,
  );

  console.log('📖 Generating for single file');

  const recipeDirPath = path.join(COOKBOOK_PATH, 'recipes', recipeName);
  if (!fs.existsSync(recipeDirPath)) {
    throw new Error(`Recipe directory ${recipeDirPath} does not exist`);
  }

  // load the existing recipe, which MUST exist
  const existingRecipe = maybeLoadExistingRecipe(recipeDirPath);
  if (existingRecipe == null) {
    throw new Error(`Recipe ${recipeName} not found`);
  }

  const patchesDirPath = path.join(recipeDirPath, 'patches');

  // find the existing step for this file
  const existingStepIndex = existingRecipe.steps.findIndex((step) =>
    step.diffs?.some((diff) => diff.file === filePathRelativeToTemplate),
  );
  if (existingStepIndex < 0) {
    throw new Error(`Step for file ${filePathRelativeToRepo} not found`);
  }

  // generate the single step for this file
  const steps = await generateSteps({
    modifiedFiles: [filePathRelativeToRepo],
    patchesDirPath,
    existingRecipe: null,
    ingredients: [],
  });
  if (steps.length !== 1) {
    throw new Error(`Expected 1 step, got ${steps.length}`);
  }

  // Write the recipe manifest
  const recipeManifestPath =
    recipeManifestFormat === 'json'
      ? path.join(recipeDirPath, 'recipe.json')
      : path.join(recipeDirPath, 'recipe.yaml');

  console.log('- 📖 Generating LLMs files…');
  generateLLMsFiles(recipeName);

  return recipeManifestPath;
}
