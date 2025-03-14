import {CommandModule} from 'yargs';
import {FILES_TO_IGNORE_FOR_GENERATE} from '../lib/constants';
import {generateRecipe} from '../lib/generate';

type GenerateArgs = {
  recipe: string;
  onlyFiles: boolean;
  referenceBranch: string;
};

export const generate: CommandModule<{}, GenerateArgs> = {
  command: 'generate',
  describe: "Generate a recipe from the skeleton's changes",
  builder: {
    recipe: {
      type: 'string',
      description: 'The name of the recipe to generate',
      required: true,
    },
    onlyFiles: {
      type: 'boolean',
      description:
        'Only generate the files for the recipe, not the recipe.json file.',
    },
    referenceBranch: {
      type: 'string',
      description: 'The reference branch to use for the recipe',
      default: 'origin/main',
    },
  },
  handler,
};

async function handler(args: GenerateArgs) {
  const recipePath = await generateRecipe({
    recipeName: args.recipe,
    filenamesToIgnore: FILES_TO_IGNORE_FOR_GENERATE,
    onlyFiles: args.onlyFiles,
    referenceBranch: args.referenceBranch,
  });

  console.log();
  console.log(recipePath);
}
