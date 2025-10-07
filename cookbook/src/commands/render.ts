import {CommandModule} from 'yargs';
import {isRenderFormat, RENDER_FORMATS, renderRecipe} from '../lib/render';
import {listRecipes, separator} from '../lib/util';

type RenderArgs = {
  recipe: string;
  format: string;
};

export const render: CommandModule<{}, RenderArgs> = {
  command: 'render',
  describe: 'Render a recipe to a given format',
  builder: {
    recipe: {
      type: 'string',
      description: 'The name of the recipe to render',
    },
    format: {
      type: 'string',
      description: 'The format to render the recipe in',
      choices: RENDER_FORMATS,
      default: 'github',
    },
  },
  handler,
};

async function handler(args: RenderArgs) {
  let recipes: string[] = [];
  if (args.recipe == null) {
    recipes = listRecipes();
    console.log('Will render all recipes:', recipes.join(', '));
    console.log(separator());
  } else {
    recipes = [args.recipe];
  }

  if (recipes.length === 0) {
    console.log('No recipes to render');
    return;
  }

  const format = args.format;
  if (!isRenderFormat(format)) {
    throw `Invalid format: ${format}`;
  }

  for await (const recipe of recipes) {
    console.log(`🎨 Rendering recipe '${recipe}' with format '${format}'`);

    renderRecipe({
      recipeName: recipe,
      format,
    });
  }
  console.log(`✅ Done`);
}
