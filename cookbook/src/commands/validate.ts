import {CommandModule} from 'yargs';
import {listRecipes, separator} from '../lib/util';
import {validateRecipe} from '../lib/validate';
import {execSync} from 'child_process';
import {TEMPLATE_PATH} from '../lib/constants';

type ValidateArgs = {
  recipe?: string;
  hydrogenPackagesVersion?: string;
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
    hydrogenPackagesVersion: {
      type: 'string',
      description:
        'The version of Hydrogen to use for the recipe. If not provided, the latest version will be used.',
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
  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i];
    console.log(
      `(${i + 1}/${recipes.length}) 🧐 Validating recipe '${recipe}'`,
    );

    const ok = validateRecipe({
      recipeTitle: recipe,
      hydrogenPackagesVersion: args.hydrogenPackagesVersion,
    });

    execSync(`git clean -fd ${TEMPLATE_PATH}`);

    if (!ok) {
      console.error(`❌ Recipe '${recipe}' is invalid`);
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
