import {CommandModule} from 'yargs';
import {FILES_TO_IGNORE_FOR_GENERATE} from '../lib/constants';
import {generateRecipe} from '../lib/generate';
import {RecipeManifestFormat} from '../lib/util';

type GenerateArgs = {
  recipe: string;
  onlyFiles: boolean;
  referenceBranch: string;
  recipeManifestFormat: RecipeManifestFormat;
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
        'Only generate the files for the recipe, not the recipe.yaml file.',
    },
    referenceBranch: {
      type: 'string',
      description: 'The reference branch to use for the recipe',
      default: 'origin/main',
    },
    recipeManifestFormat: {
      type: 'string',
      description: 'The format of the recipe manifest file',
      default: 'yaml',
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
    recipeManifestFormat: args.recipeManifestFormat,
  });

  console.log();
  console.log(recipePath);
}
