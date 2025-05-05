import {execSync} from 'child_process';
import {CommandModule} from 'yargs';
import {applyRecipe} from '../lib/apply';
import {FILES_TO_IGNORE_FOR_GENERATE, TEMPLATE_PATH} from '../lib/constants';
import {generateRecipe} from '../lib/generate';
import {isRenderFormat, RENDER_FORMATS, renderRecipe} from '../lib/render';
import {separator, RecipeManifestFormat} from '../lib/util';
import {copyCursorRulesToSkeleton} from '../lib/llms';

type RegenerateArgs = {
  recipe: string;
  onlyFiles: boolean;
  format: string;
  referenceBranch: string;
  recipeManifestFormat: RecipeManifestFormat;
};

export const regenerate: CommandModule<{}, RegenerateArgs> = {
  command: 'regenerate',
  describe: 'Regenerate a recipe',
  builder: {
    recipe: {
      type: 'string',
      description:
        'The name of the recipe to regenerate. If not provided, all recipes will be regenerated.',
      required: true,
    },
    onlyFiles: {
      type: 'boolean',
      description:
        'Only generate the files for the recipe, not the recipe.yaml file.',
    },
    format: {
      type: 'string',
      description: 'The format to render the recipe in',
      choices: RENDER_FORMATS,
      default: 'github',
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

async function handler(args: RegenerateArgs) {
  const format = args.format;
  if (!isRenderFormat(format)) {
    throw `Invalid format: ${format}`;
  }

  console.log(`🔄 Regenerating recipe '${args.recipe}'`);
  // apply the recipe
  applyRecipe({
    recipeTitle: args.recipe,
  });
  // generate the recipe
  await generateRecipe({
    recipeName: args.recipe,
    onlyFiles: args.onlyFiles,
    filenamesToIgnore: FILES_TO_IGNORE_FOR_GENERATE,
    referenceBranch: args.referenceBranch,
    recipeManifestFormat: args.recipeManifestFormat,
  });
  // render the recipe
  renderRecipe({
    recipeName: args.recipe,
    format,
  });
  // clean up the skeleton template directory
  execSync(`git checkout -- ${TEMPLATE_PATH}`);
  execSync(`git clean -fd ${TEMPLATE_PATH}`);
  console.log(`✅ Regenerated recipe '${args.recipe}'`);
  console.log(separator());

  copyCursorRulesToSkeleton(args.recipe);
}
