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
  mdCodeString,
  mdFrontMatter,
  mdHeading,
  mdLinkString,
  mdList,
  mdNote,
  mdParagraph,
  mdTable,
  serializeMDBlocksToFile,
} from './markdown';
import {Ingredient, loadRecipe, Recipe, Step} from './recipe';
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

  // Read and parse the recipe from the recipe manifest file
  const recipe: Recipe = loadRecipe({directory: recipeDir});

  // Write the markdown file to the current directory as README.md
  serializeMDBlocksToFile(
    makeReadmeBlocks(recipeName, recipe, params.format),
    path.join(
      recipeDir,
      params.format === 'github'
        ? RENDER_FILENAME_GITHUB
        : RENDER_FILENAME_SHOPIFY,
    ),
    params.format,
  );
}

export function makeReadmeBlocks(
  recipeName: string,
  recipe: Recipe,
  format: RenderFormat,
) {
  const markdownTitle = makeTitle(recipe, format);

  const markdownDescription = mdParagraph(recipe.description);

  const markdownNotes = maybeMDBlock(recipe.notes, (notes) =>
    notes.map(mdNote),
  );

  const markdownIngredients = makeIngredients(recipe.ingredients);

  const markdownSteps = makeSteps(
    recipe.steps,
    recipe.ingredients,
    getPatchesDir(recipeName),
  );

  const markdownDeletedFiles =
    recipe.deletedFiles != null && recipe.deletedFiles.length > 0
      ? [
          mdHeading(2, 'Deleted Files'),
          mdList(
            recipe.deletedFiles.map((file) =>
              mdLinkString(`/templates/skeleton/${file}`, mdCodeString(file)),
            ),
          ),
        ]
      : [];

  const markdownRequirements =
    recipe.requirements != null
      ? [mdHeading(2, 'Requirements'), mdParagraph(recipe.requirements)]
      : [];

  const blocks: MDBlock[] = [
    markdownTitle,
    markdownDescription,
    ...markdownNotes,
    ...markdownRequirements,
    ...markdownIngredients,
    ...markdownSteps,
    ...markdownDeletedFiles,
  ];

  return blocks;
}

function makeIngredients(ingredients: Ingredient[]): MDBlock[] {
  if (ingredients.length === 0) {
    return [];
  }

  return [
    mdHeading(2, 'Ingredients'),
    mdParagraph('_New files added to the template by this recipe._'),
    mdTable(
      ['File', 'Description'],
      ingredients.map((ingredient): string[] => {
        return [
          mdLinkString(
            `ingredients/${ingredient.path}`,
            mdCodeString(ingredient.path.replace(TEMPLATE_DIRECTORY, '')),
          ),
          ingredient.description ?? '',
        ];
      }),
    ),
  ];
}

function makeSteps(
  steps: Step[],
  ingredients: Ingredient[],
  patchesDir: string,
): MDBlock[] {
  const markdownStepsHeader = mdHeading(2, 'Steps');
  return [
    markdownStepsHeader,
    ...steps.flatMap((step, index) =>
      renderStep(step, index, ingredients, patchesDir, {
        collapseDiffs: true,
      }),
    ),
  ];
}

export function renderStep(
  step: Step,
  index: number,
  ingredients: Ingredient[],
  patchesDir: string,
  options: {
    collapseDiffs?: boolean;
    diffsRelativeToTemplate?: boolean;
    trimDiffHeaders?: boolean;
  } = {},
): MDBlock[] {
  function getDiffs(): MDBlock[] {
    if (step.diffs == null || step.diffs.length === 0) {
      return [];
    }

    return step.diffs.flatMap((diff) => {
      const patchFile = path.join(patchesDir, diff.patchFile);
      const rawPatch = fs.readFileSync(patchFile, 'utf8').trim();

      const patch = options.trimDiffHeaders
        ? rawPatch.split('\n').slice(3).join('\n')
        : rawPatch;

      const collapsed =
        options.collapseDiffs === true &&
        patch.split('\n').length > COLLAPSE_DIFF_LINES;

      return [
        mdHeading(
          4,
          options.diffsRelativeToTemplate
            ? `File: /${diff.file}`
            : `File: ${mdLinkString(
                `/templates/skeleton/${diff.file}`,
                mdCodeString(diff.file),
              )}`,
        ),
        mdCode('diff', patch, collapsed),
      ];
    });
  }

  const markdownStep: MDBlock[] = [
    mdHeading(3, `Step ${index + 1}: ${step.name}`),
    ...(step.notes?.map(mdNote) ?? []),
    mdParagraph(step.description ?? ''),
    ...(step.ingredients != null
      ? [
          mdList(
            step.ingredients
              .filter((ingredient) =>
                ingredients.some((other) => other.path === ingredient),
              )
              .map((i) =>
                mdLinkString(
                  `ingredients/${i}`,
                  mdCodeString(i.replace(TEMPLATE_DIRECTORY, '')),
                ),
              ),
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
        description: recipe.summary,
      });
    case 'github':
      return mdHeading(1, recipe.title);
    default:
      assertNever(format);
  }
}
