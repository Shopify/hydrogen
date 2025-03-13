import {randomUUID} from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  COOKBOOK_PATH,
  RENDER_FILENAME_GITHUB,
  RENDER_FILENAME_SHOPIFY,
  TEMPLATE_DIRECTORY,
} from './constants';
import {
  maybeMDBlock,
  MDBlock,
  mdCode,
  mdFrontMatter,
  mdHeading,
  mdImage,
  mdList,
  mdNote,
  mdParagraph,
  mdTable,
  serializeMDBlocksToFile,
} from './markdown';
import {Ingredient, parseRecipeFromString, Recipe, Step} from './recipe';
import {assertNever, getPatchesDir} from './util';

// The number of lines to collapse a diff into a details block
const COLLAPSE_DIFF_LINES = 50;

export const RENDER_FORMATS = ['github', 'shopify.dev'] as const;
export type RenderFormat = (typeof RENDER_FORMATS)[number];

export function isRenderFormat(format: string): format is RenderFormat {
  return RENDER_FORMATS.includes(format as RenderFormat);
}

/**
 * Render a recipe.
 * @param params - The parameters for the recipe.
 */
export function renderRecipe(params: {
  recipeName: string;
  format: RenderFormat;
}) {
  const {recipeName} = params;

  // The recipe name is the first argument passed to the script
  if (!recipeName) {
    throw new Error('Recipe name is required.');
  }

  const recipeDir = path.join(COOKBOOK_PATH, 'recipes', recipeName);

  // Read and parse the recipe from the recipe.json file
  const recipePath = path.join(recipeDir, 'recipe.json');
  const recipe: Recipe = parseRecipeFromString(
    fs.readFileSync(recipePath, 'utf8'),
  );

  // Write the markdown file to the current directory as README.md
  serializeMDBlocksToFile(
    makeReadmeBlocks(recipeName, recipe, params.format),
    path.join(
      recipeDir,
      params.format === 'github'
        ? RENDER_FILENAME_GITHUB
        : RENDER_FILENAME_SHOPIFY,
    ),
  );
}

function makeReadmeBlocks(
  recipeName: string,
  recipe: Recipe,
  format: RenderFormat,
) {
  const markdownTitle = makeTitle(recipe, format);

  const markdownImage = maybeMDBlock(recipe.image, (image) => [
    mdImage(recipe.title, image),
  ]);

  const markdownDescription = mdParagraph(recipe.description);

  const markdownNotes = maybeMDBlock(recipe.notes, (notes) =>
    notes.map(mdNote),
  );

  const markdownIngredients = makeIngredients(recipe.ingredients);

  const markdownSteps = makeSteps(
    recipe.steps,
    recipe.ingredients,
    format,
    getPatchesDir(recipeName),
  );

  const markdownDeletedFiles =
    recipe.deletedFiles != null && recipe.deletedFiles.length > 0
      ? [
          mdHeading(2, '🗑️ Deleted Files'),
          mdList(recipe.deletedFiles.map((file) => `[\`${file}\`](${file})`)),
        ]
      : [];

  const blocks: MDBlock[] = [
    markdownTitle,
    ...markdownImage,
    markdownDescription,
    ...markdownNotes,
    ...markdownIngredients,
    ...markdownSteps,
    ...markdownDeletedFiles,
  ];

  return blocks;
}

function makeIngredients(ingredients: Ingredient[]): MDBlock[] {
  return [
    mdHeading(2, '🍣 Ingredients'),
    mdTable(
      ['File', 'Description'],
      ingredients
        .filter((ingredient) => ingredient.description != null)
        .map((ingredient): string[] => {
          return [
            `[\`${ingredient.path.replace(
              TEMPLATE_DIRECTORY,
              '',
            )}\`](ingredients/${ingredient.path})`,
            ingredient.description ?? '',
          ];
        }),
    ),
  ];
}

function makeSteps(
  steps: Step[],
  ingredients: Ingredient[],
  format: RenderFormat,
  patchesDir: string,
): MDBlock[] {
  const markdownStepsHeader = mdHeading(2, '🍱 Steps');
  return [
    markdownStepsHeader,
    ...steps.flatMap((step, index) =>
      renderStep(step, index, ingredients, format, patchesDir),
    ),
  ];
}

export function renderStep(
  step: Step,
  index: number,
  ingredients: Ingredient[],
  format: RenderFormat,
  patchesDir: string,
): MDBlock[] {
  function getDiffs(): MDBlock[] {
    if (step.diffs == null || step.diffs.length === 0) {
      return [];
    }

    return step.diffs.flatMap((diff) => {
      const patchFile = path.join(patchesDir, diff.patchFile);
      const patch = fs.readFileSync(patchFile, 'utf8');

      // remove @description comments from the rendered patch
      const renderedPatch = patch.replace(/[\/# *]*\s+@description.*/g, '');

      const collapsed =
        format === 'github' &&
        renderedPatch.split('\n').length > COLLAPSE_DIFF_LINES;

      return [
        mdHeading(
          4,
          `File: [\`${diff.file}\`](/templates/skeleton/${diff.file})`,
        ),
        mdCode('diff', renderedPatch, collapsed),
      ];
    });
  }

  const markdownStep: MDBlock[] = [
    mdHeading(3, `${index + 1}. ${step.name}`),
    ...(step.notes?.map(mdNote) ?? []),
    mdParagraph(step.description ?? ''),
    ...(step.ingredients != null
      ? [
          mdList(
            step.ingredients
              .filter((ingredient) =>
                ingredients.some((other) => other.path === ingredient),
              )
              .map((i) => `\`${i.replace(TEMPLATE_DIRECTORY, '')}\``),
          ),
        ]
      : []),
    ...getDiffs(),
  ];

  return markdownStep;
}

function makeTitle(recipe: Recipe, format: RenderFormat): MDBlock {
  switch (format) {
    case 'shopify.dev':
      return mdFrontMatter({
        gid: randomUUID(),
        title: recipe.title,
        description: recipe.description,
      });
    case 'github':
      return mdHeading(1, `🧑‍🍳 ${recipe.title}`);
    default:
      assertNever(format);
  }
}
