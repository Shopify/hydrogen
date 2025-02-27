import {execSync} from 'child_process';
import {CommandModule} from 'yargs';
import {TEMPLATE_PATH} from '../lib/constants';
import {listRecipes, separator} from '../lib/util';
import {validateRecipe} from '../lib/validate';

type ValidateArgs = {
  recipe: string;
};

export const validate: CommandModule<{}, ValidateArgs> = {
  command: 'validate',
  describe: 'Validate a recipe',
  builder: {
    recipe: {
      type: 'string',
      description:
        'The name of the recipe to validate. If not provided, all recipes will be validated.',
    },
  },
  handler,
};

async function handler(args: ValidateArgs) {
  let recipes: string[] = [];
  if (args.recipe == null) {
    recipes = listRecipes();
    console.log('Will validate all recipes:', recipes.join(', '));
    console.log(separator());
  } else {
    recipes = [args.recipe];
  }

  let failed: string[] = [];
  for (const recipe of recipes) {
    try {
      console.log(`🧐 Validating recipe '${recipe}'`);
      validateRecipe({
        recipeTitle: recipe,
      });
      // clean up the skeleton template directory on success
      execSync(`git checkout -- ${TEMPLATE_PATH}`);
      execSync(`git clean -fd ${TEMPLATE_PATH}`);
    } catch (error) {
      console.error(`❌ Recipe '${recipe}' is invalid`);
      console.error(error);
      failed.push(recipe);
    }
    console.log(separator());
  }

  if (failed.length > 0) {
    console.log('😭 Some recipes are invalid:', failed.join(', '));
    process.exit(1);
  } else {
    console.log('😋 All recipes are valid');
  }
}
