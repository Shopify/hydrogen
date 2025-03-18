import {execSync} from 'child_process';
import {createHash} from 'crypto';
import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';
import {
  COOKBOOK_PATH,
  REPO_ROOT,
  TEMPLATE_DIRECTORY,
  TEMPLATE_PATH,
} from './constants';
import {Ingredient, parseRecipeFromString, Recipe, Step} from './recipe';
import {
  createDirectoryIfNotExists,
  getMainCommitHash,
  getStepDescription,
  isInGitHistory,
  parseGitStatus,
  parseReferenceBranch,
  recreateDirectory,
  separator,
} from './util';

const TODO = '*TODO*';

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
}): Promise<string> {
  const {recipeName, filenamesToIgnore, referenceBranch} = params;

  console.log('📖 Generating recipe');

  // create the recipe directory if it doesn't exist
  const recipeDirPath = path.join(COOKBOOK_PATH, 'recipes', recipeName);
  createDirectoryIfNotExists(recipeDirPath);

  // load the existing recipe if it exists
  const existingRecipePath = path.join(recipeDirPath, 'recipe.json');
  const existingRecipe = maybeLoadExistingRecipe(existingRecipePath);

  // clean up the ingredients directory
  const ingredientsDirPath = path.join(recipeDirPath, 'ingredients');
  recreateDirectory(ingredientsDirPath);

  // clean up the patches directory
  const patchesDirPath = path.join(recipeDirPath, 'patches');
  recreateDirectory(patchesDirPath);

  // rewind changes to the recipe directory (if the recipe directory is not new)
  if (existingRecipe != null && !isInGitHistory({path: recipeDirPath})) {
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
      description:
        getStepDescription(path.join(REPO_ROOT, file), 'ingredient') ??
        existingDescription ??
        null,
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
    userQueries: existingRecipe?.userQueries ?? [],
    troubleshooting: existingRecipe?.troubleshooting ?? [],
    description: existingRecipe?.description ?? TODO,
    notes: existingRecipe?.notes ?? [],
    deletedFiles,
    ingredients,
    steps,
    commit: getMainCommitHash(parseReferenceBranch(referenceBranch)),
  };

  // Write the recipe to recipe.json
  const recipeJSONPath = path.join(recipeDirPath, 'recipe.json');
  fs.writeFileSync(recipeJSONPath, JSON.stringify(recipe, null, 2));

  // TODO llms.txt

  return recipeJSONPath;
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

  const modifiedFiles = params.modifiedFiles.filter(
    (file) => !file.endsWith('.generated.d.ts'),
  );

  for await (const file of modifiedFiles) {
    const {fullPath, patchFilePath, patchFilename} = getPatchfile({
      file,
      patchesDirPath: params.patchesDirPath,
    });

    const inFileDescription = getStepDescription(patchFilePath, 'patch');

    let description =
      inFileDescription != null && inFileDescription.trim() != ''
        ? inFileDescription
        : null;

    const existingStep = params.existingRecipe?.steps.find(
      (step) =>
        step.diffs != null &&
        step.diffs.length === 1 &&
        step.diffs[0].file === fullPath.replace(TEMPLATE_PATH, ''),
    );

    // Try to find the existing description for the step which has _only_ this file as a diff patch.
    const existingDescription = existingStep?.description ?? null;

    // if the existing description is found, ask the user which one to keep
    if (existingDescription != null && existingDescription !== description) {
      console.log(separator());
      console.log('Existing description:');
      console.log();
      console.log(existingDescription);
      console.log(separator());
      console.log('New description:');
      console.log();
      console.log(description);
      console.log(separator());
      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'description',
          message: `The step "${file.replace(
            TEMPLATE_DIRECTORY,
            '',
          )}" has an existing description. Which one do you want to keep?`,
          choices: [
            {
              name: 'Existing description',
              value: existingDescription,
            },
            {
              name: 'New description',
              value: description,
            },
          ],
        },
      ]);
      description = answer.description;
    }

    const step: Step = {
      type: 'PATCH',
      name: existingStep?.name ?? file.replace(TEMPLATE_DIRECTORY, ''),
      description: description ?? existingDescription ?? null,
      diffs: [
        {
          file: fullPath.replace(TEMPLATE_PATH, ''),
          patchFile: patchFilename,
        },
      ],
    };
    patchSteps.push(step);
  }

  // generate the codegen step, if there are any generated types files
  const generatedTypesFiles = params.modifiedFiles.filter((file) =>
    file.endsWith('.generated.d.ts'),
  );
  const maybeCodegenStep: Step[] =
    generatedTypesFiles.length > 0
      ? [
          codegenStep({
            generatedTypesFiles,
            patchesDirPath: params.patchesDirPath,
          }),
        ]
      : [];
  // add the copy ingredients step if there are ingredients
  const maybeCopyIngredientsStep: Step[] =
    params.ingredients.length > 0
      ? [copyIngredientsStep(params.ingredients)]
      : [];

  return [
    ...existingInfoSteps,
    ...maybeCopyIngredientsStep,
    ...patchSteps,
    ...maybeCodegenStep,
  ];
}

function maybeLoadExistingRecipe(recipePath: string): Recipe | null {
  if (!fs.existsSync(recipePath)) {
    return null;
  }

  try {
    return parseRecipeFromString(fs.readFileSync(recipePath, 'utf8'));
  } catch (error) {
    console.warn(`❌ Failed to load existing recipe from ${recipePath}`);
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

function codegenStep(params: {
  generatedTypesFiles: string[];
  patchesDirPath: string;
}): Step {
  const {generatedTypesFiles, patchesDirPath} = params;
  return {
    type: 'PATCH',
    name: 'Codegen',
    diffs: generatedTypesFiles.map((file) => {
      const {fullPath, patchFilename} = getPatchfile({
        file,
        patchesDirPath,
      });
      return {
        file: fullPath.replace(TEMPLATE_PATH, ''),
        patchFile: patchFilename,
      };
    }),
  };
}

function getPatchfile(params: {file: string; patchesDirPath: string}) {
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
  return {fullPath, patchFilePath, patchFilename};
}
