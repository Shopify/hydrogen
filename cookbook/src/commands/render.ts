import {CommandModule} from 'yargs';
import {isRenderFormat, RENDER_FORMATS, renderRecipe} from '../lib/render';

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
      required: true,
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
  const format = args.format;
  if (!isRenderFormat(format)) {
    throw `Invalid format: ${format}`;
  }

  renderRecipe({
    recipeName: args.recipe,
    format,
  });
}
