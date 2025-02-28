import {CommandModule} from 'yargs';
import {applyRecipe} from '../lib/apply';

type ApplyArgs = {
  recipe: string;
};

export const apply: CommandModule<{}, ApplyArgs> = {
  command: 'apply',
  describe: 'Apply a recipe to the current project',
  builder: {
    recipe: {
      type: 'string',
      description: 'The name of the recipe to apply',
      required: true,
    },
  },
  handler,
};

function handler(args: ApplyArgs) {
  applyRecipe({
    recipeTitle: args.recipe,
  });
}
