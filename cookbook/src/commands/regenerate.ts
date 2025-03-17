import {execSync} from 'child_process';
import {CommandModule} from 'yargs';
import {applyRecipe} from '../lib/apply';
import {FILES_TO_IGNORE_FOR_GENERATE, TEMPLATE_PATH} from '../lib/constants';
import {generateRecipe} from '../lib/generate';
import {isRenderFormat, RENDER_FORMATS, renderRecipe} from '../lib/render';
import {listRecipes, separator} from '../lib/util';

type RegenerateArgs = {
  recipe?: string;
  onlyFiles: boolean;
  format: string;
  referenceBranch: string;
};

export const regenerate: CommandModule<{}, RegenerateArgs> = {
  command: 'regenerate',
  describe: 'Regenerate a recipe',
  builder: {
    recipe: {
      type: 'string',
      description:
        'The name of the recipe to regenerate. If not provided, all recipes will be regenerated.',
    },
    onlyFiles: {
      type: 'boolean',
      description:
        'Only generate the files for the recipe, not the recipe.json file.',
    },
    format: {
      type: 'string',
      description: 'The format to render the recipe in',
      required: true,
      choices: RENDER_FORMATS,
    },
    referenceBranch: {
      type: 'string',
      description: 'The reference branch to use for the recipe',
      default: 'origin/main',
    },
  },
  handler,
};

async function handler(args: RegenerateArgs) {
  let recipes: string[] = [];
  if (args.recipe == null) {
    recipes = listRecipes();
    console.log('Will regenerate all recipes:', recipes.join(', '));
    console.log(separator());
  } else {
    recipes = [args.recipe];
  }

  const format = args.format;
  if (!isRenderFormat(format)) {
    throw `Invalid format: ${format}`;
  }

  for await (const recipe of recipes) {
    console.log(`🔄 Regenerating recipe '${recipe}'`);
    // apply the recipe
    applyRecipe({
      recipeTitle: recipe,
    });
    // generate the recipe
    await generateRecipe({
      recipeName: recipe,
      onlyFiles: args.onlyFiles,
      filenamesToIgnore: FILES_TO_IGNORE_FOR_GENERATE,
      referenceBranch: args.referenceBranch,
    });
    // render the recipe
    renderRecipe({
      recipeName: recipe,
      format,
    });
    // clean up the skeleton template directory
    execSync(`git checkout -- ${TEMPLATE_PATH}`);
    execSync(`git clean -fd ${TEMPLATE_PATH}`);
    console.log(`✅ Regenerated recipe '${recipe}'`);
    console.log(separator());
  }
}
