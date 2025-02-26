import {randomUUID} from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  COOKBOOK_PATH,
  TEMPLATE_DIRECTORY,
  RENDER_FILENAME_GITHUB,
  RENDER_FILENAME_SHOPIFY,
} from './constants';
import {
  MDBlock,
  mdCode,
  mdFrontMatter,
  mdHeading,
  mdImage,
  mdList,
  mdNote,
  mdParagraph,
  mdTable,
  renderMDBlock,
} from './markdown';
import {Ingredient, parseRecipeFromString, Recipe, Step} from './recipe';

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

  const patchesDir = path.join(recipeDir, 'patches');

  const markdownTitle = makeTitle(recipe, params.format);

  const markdownImage = maybeBlock(recipe.image, (image) => [
    mdImage(recipe.title, image),
  ]);

  const markdownDescription = mdParagraph(recipe.description);

  const markdownNotes = maybeBlock(recipe.notes, (notes) => notes.map(mdNote));

  const markdownIngredients = makeIngredients(recipe.ingredients);

  const markdownSteps = makeSteps(
    recipe.steps,
    recipe.ingredients,
    params.format,
    patchesDir,
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

  // Render all the blocks
  const markdown = blocks.map(renderMDBlock).join('\n\n');

  // Write the markdown file to the current directory as README.md
  fs.writeFileSync(
    path.join(
      recipeDir,
      params.format === 'github'
        ? RENDER_FILENAME_GITHUB
        : RENDER_FILENAME_SHOPIFY,
    ),
    markdown,
  );
}

function makeIngredients(ingredients: Ingredient[]): MDBlock[] {
  return [
    mdHeading(2, '🍣 Ingredients'),
    mdTable(
      ['File', 'Description'],
      ingredients
        .filter((ingredient) => ingredient.description != null)
        .map((ingredient) => {
          return [
            `[\`${ingredient.path.replace(
              TEMPLATE_DIRECTORY,
              '',
            )}\`](ingredients/${ingredient.path})`,
            ingredient.description,
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
  function renderStep(step: Step, index: number): MDBlock[] {
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
      ...(step.substeps != null
        ? step.substeps.flatMap((substep, substepIndex) => [
            mdHeading(4, `${index + 1}.${substepIndex + 1}. ${substep.name}`),
            mdParagraph(substep.description),
          ])
        : []),
    ];

    return markdownStep;
  }

  return [markdownStepsHeader, ...steps.flatMap(renderStep)];
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
      const exhaustiveCheck: never = format;
      throw new Error(`Unknown format: ${exhaustiveCheck}`);
  }
}

function maybeBlock<T>(
  value: T | null | undefined,
  makeBlock: (v: T) => MDBlock[],
): MDBlock[] {
  if (value == null) {
    return [];
  }
  return makeBlock(value);
}
