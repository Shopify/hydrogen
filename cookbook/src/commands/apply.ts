import {CommandModule} from 'yargs';
import {applyRecipe} from '../lib/apply';
import {withResolvedCatalog} from '../lib/workspace';

type ApplyArgs = {
  recipe: string;
  template?: string;
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
    template: {
      type: 'string',
      description:
        'Path to template directory (defaults to templates/skeleton)',
      required: false,
    },
  },
  handler,
};

function handler(args: ApplyArgs) {
  withResolvedCatalog(() => {
    applyRecipe({
      recipeTitle: args.recipe,
      templatePath: args.template,
    });
  });
}
