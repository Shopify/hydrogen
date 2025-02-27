import {execSync} from 'child_process';
import {applyRecipe} from '../lib/apply';
import {generateRecipe} from '../lib/generate';
import {
  COOKBOOK_PATH,
  FILES_TO_IGNORE_FOR_GENERATE,
  REPO_ROOT,
  TEMPLATE_PATH,
} from '../lib/constants';
import {renderRecipe} from '../lib/render';
import {parseRecipeFromString} from '../lib/recipe';
import path from 'path';
import fs from 'fs';
import os from 'os';
import inquirer from 'inquirer';
import {CommandModule} from 'yargs';
import {parseReferenceBranch} from '../lib/util';
type UpdateArgs = {
  recipe: string;
  referenceBranch: string;
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
  const {commit} = parseRecipeFromString(
    fs.readFileSync(
      path.join(COOKBOOK_PATH, 'recipes', recipeName, 'recipe.json'),
      'utf8',
    ),
  );

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

  // copy the skeleton to a temp folder, ignoring the node_modules folder
  const skeletonDir = path.join(os.tmpdir(), `skeleton-${Date.now()}`);
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
  });

  // copy the recipe to the temp folder
  const tempDir = path.join(
    os.tmpdir(),
    `update-recipe-${recipeName}-${Date.now()}`,
  );
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

  // delete the temp branches
  execSync(`git branch -D ${applyBranch}`);
  execSync(`git branch -D ${updateBranch}`);

  // we're golden
  console.log(`🎉 Recipe updated: ${recipeName}`);
}
