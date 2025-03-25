import {execSync} from 'child_process';
import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';
import {CommandModule} from 'yargs';
import {applyRecipe} from '../lib/apply';
import {
  COOKBOOK_PATH,
  FILES_TO_IGNORE_FOR_GENERATE,
  REPO_ROOT,
  TEMPLATE_PATH,
} from '../lib/constants';
import {generateRecipe} from '../lib/generate';
import {renderRecipe} from '../lib/render';
import {
  RecipeManifestFormat,
  SkipPrompts,
  makeRandomTempDir,
  parseReferenceBranch,
} from '../lib/util';
import {loadRecipe} from '../lib/recipe';
type UpdateArgs = {
  recipe: string;
  referenceBranch: string;
  skipPrompts?: SkipPrompts;
  llmAPIKey?: string;
  llmURL?: string;
  llmModel?: string;
  recipeManifestFormat: RecipeManifestFormat;
};

export const update: CommandModule<{}, UpdateArgs> = {
  command: 'update',
  describe: 'Update a recipe',
  builder: {
    recipe: {
      type: 'string',
      description: 'The name of the recipe to update',
      required: true,
    },
    referenceBranch: {
      type: 'string',
      description: 'The branch to update the recipe from',
      default: 'origin/main',
    },
    skipPrompts: {
      type: 'string',
      description: 'Default prompts answer',
    },
    llmAPIKey: {
      type: 'string',
      description: 'The API key for the LLM to use',
    },
    llmURL: {
      type: 'string',
      description: 'The URL for the LLM to use',
    },
    llmModel: {
      type: 'string',
      description: 'The model for the LLM to use',
    },
    recipeManifestFormat: {
      type: 'string',
      description: 'The format of the recipe manifest file',
      default: 'json',
    },
  },
  handler,
};

async function handler(args: UpdateArgs) {
  const {recipe: recipeName} = args;

  const parsedReferenceBranch = parseReferenceBranch(args.referenceBranch);

  console.log(`🌳 Updating recipe: ${recipeName}`);

  // ensure we're on the main branch
  execSync(`git checkout ${parsedReferenceBranch.branch}`);
  if (parsedReferenceBranch.remote != null) {
    execSync('git pull');
  }

  // load the recipe
  const {commit} = loadRecipe({
    directory: path.join(COOKBOOK_PATH, 'recipes', recipeName),
  });

  // checkout the repo at the recipe's commit hash
  execSync(`git checkout ${commit}`);

  // apply the recipe
  applyRecipe({recipeTitle: recipeName});
  const applyBranch = `update-recipe-${recipeName}-${Date.now()}`;
  console.log(`- Using branch: ${applyBranch}`);

  execSync(`git checkout -b ${applyBranch}`);
  execSync(`git add .`, {cwd: REPO_ROOT});
  execSync(`git commit -m "Update ${recipeName}"`, {cwd: REPO_ROOT});

  // merge the reference branch into the apply branch
  let mergeOk = false;
  try {
    execSync(`git merge ${parsedReferenceBranch.branch}`, {cwd: REPO_ROOT});
    mergeOk = true;
  } catch (err) {
    console.log(
      'Merge failed. Please make sure there are no merge conflicts and then proceed.',
    );
    mergeOk = false;
  }

  // if there are conflicts, ask the user to resolve them
  if (!mergeOk) {
    while (true) {
      await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: 'Are the conflicts resolved?',
      });
      const status = execSync(`git status`).toString();
      if (!status.includes('Unmerged paths')) {
        break;
      }
    }

    execSync(`git add .`, {cwd: REPO_ROOT});
    execSync(
      `git commit --allow-empty -m "Merge ${applyBranch} into ${parsedReferenceBranch.branch}"`,
      {
        cwd: REPO_ROOT,
      },
    );
  }

  // create a temp folder for the transient skeleton files
  const skeletonDir = makeRandomTempDir({prefix: 'skeleton'});
  // create a temp folder for the transient recipe files
  const tempDir = makeRandomTempDir({prefix: 'update-recipe'});

  try {
    // copy the skeleton to a temp folder, ignoring the node_modules folder
    fs.cpSync(TEMPLATE_PATH, skeletonDir, {
      recursive: true,
      filter: (src) => {
        return !src.includes('node_modules');
      },
    });

    // checkout the reference branch
    execSync(`git checkout ${parsedReferenceBranch.branch}`);

    // create a new branch
    const updateBranch = `update-recipe-${recipeName}-${Date.now()}`;
    execSync(`git checkout -b ${updateBranch}`);

    // copy the temp skeleton to the skeleton folder
    fs.cpSync(skeletonDir, TEMPLATE_PATH, {
      recursive: true,
    });

    // generate the recipe
    await generateRecipe({
      recipeName,
      filenamesToIgnore: FILES_TO_IGNORE_FOR_GENERATE,
      onlyFiles: false,
      referenceBranch: args.referenceBranch,
      llmAPIKey: args.llmAPIKey,
      llmURL: args.llmURL,
      llmModel: args.llmModel,
      skipPrompts: args.skipPrompts,
      recipeManifestFormat: args.recipeManifestFormat,
    });

    // copy the recipe to the temp folder
    fs.cpSync(path.join(COOKBOOK_PATH, 'recipes', recipeName), tempDir, {
      recursive: true,
    });

    // commit the changes
    execSync(`git add .`, {cwd: REPO_ROOT});
    execSync(`git commit -m "Update ${recipeName}"`, {cwd: REPO_ROOT});

    // checkout the main branch
    execSync(`git checkout ${parsedReferenceBranch.branch}`);

    // copy the temp recipe folder to the recipe folder
    fs.cpSync(tempDir, path.join(COOKBOOK_PATH, 'recipes', recipeName), {
      recursive: true,
    });

    // render the recipe
    await renderRecipe({
      recipeName,
      format: 'github',
    });

    // delete the temp branches and cleanup temp folders
    execSync(`git branch -D ${applyBranch}`);
    execSync(`git branch -D ${updateBranch}`);
  } finally {
    // cleanup temp folders
    fs.rmSync(tempDir, {recursive: true});
    fs.rmSync(skeletonDir, {recursive: true});
  }

  // we're golden
  console.log(`🎉 Recipe updated: ${recipeName}`);
}
