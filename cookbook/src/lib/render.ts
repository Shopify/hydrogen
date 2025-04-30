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

  const markdownIngredients = makeIngredients(
    recipeName,
    recipe.ingredients,
    format,
  );

  const markdownSteps = makeSteps(
    recipe.steps,
    recipe.ingredients,
    recipeName,
    getPatchesDir(recipeName),
    format,
  );

  const markdownDeletedFiles =
    recipe.deletedFiles != null && recipe.deletedFiles.length > 0
      ? [
          mdHeading(2, 'Deleted Files'),
          mdList(
            recipe.deletedFiles.map((file) => {
              const linkPrefix =
                format === 'shopify.dev' ? hydrogenRepoFolderURL('') : '';
              return mdLinkString(
                `${linkPrefix}/templates/skeleton/${file}`,
                file,
              );
            }),
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

function makeIngredients(
  recipeName: string,
  ingredients: Ingredient[],
  format: RenderFormat,
): MDBlock[] {
  if (ingredients.length === 0) {
    return [];
  }

  return [
    mdHeading(2, 'Ingredients'),
    mdParagraph('_New files added to the template by this recipe._'),
    mdTable(
      ['File', 'Description'],
      ingredients.map((ingredient): string[] => {
        const link =
          format === 'shopify.dev'
            ? hydrogenRepoRecipeBaseURL(recipeName) +
              `/ingredients/${ingredient.path}`
            : `ingredients/${ingredient.path}`;
        return [
          mdLinkString(link, ingredient.path.replace(TEMPLATE_DIRECTORY, '')),
          ingredient.description ?? '',
        ];
      }),
    ),
  ];
}

function makeSteps(
  steps: Step[],
  ingredients: Ingredient[],
  recipeName: string,
  patchesDir: string,
  format: RenderFormat,
): MDBlock[] {
  const markdownStepsHeader = mdHeading(2, 'Steps');
  return [
    markdownStepsHeader,
    ...steps.flatMap((step, index) =>
      renderStep(step, index, ingredients, recipeName, patchesDir, format, {
        collapseDiffs: true,
        diffsRelativeToTemplate: format === 'shopify.dev',
        trimDiffHeaders: format === 'shopify.dev',
      }),
    ),
  ];
}

export function renderStep(
  step: Step,
  index: number,
  ingredients: Ingredient[],
  recipeName: string,
  patchesDir: string,
  format: RenderFormat,
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

      const linkPrefixRepo =
        format === 'shopify.dev' ? hydrogenRepoFolderURL('') : '';
      const linkPrefixRecipe =
        format === 'shopify.dev' ? hydrogenRepoRecipeBaseURL(recipeName) : '';
      const link = `${linkPrefixRepo}/templates/skeleton/${diff.file}`;

      return [
        format === 'github'
          ? mdHeading(
              4,
              options.diffsRelativeToTemplate
                ? `File: /${diff.file}`
                : `File: ${mdLinkString(link, diff.file)}`,
            )
          : mdHeading(
              4,
              [
                'File:',
                mdLinkString(link, path.basename(diff.file)),
                `(${mdLinkString(
                  `${linkPrefixRecipe}/patches/${diff.patchFile}`,
                  'patch',
                )})`,
              ].join(' '),
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
              .map((i) => {
                const linkPrefix =
                  format === 'shopify.dev'
                    ? hydrogenRepoRecipeBaseURL(recipeName)
                    : '';
                return mdLinkString(
                  `${linkPrefix}/ingredients/${i}`,
                  i.replace(TEMPLATE_DIRECTORY, ''),
                );
              }),
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

const HYDROGEN_REPO_BASE_URL = 'https://github.com/Shopify/hydrogen';

function hydrogenRepoFolderURL(path: string): string {
  const pathWithoutLeadingSlash = path.startsWith('/') ? path.slice(1) : path;
  const url = `${HYDROGEN_REPO_BASE_URL}/tree/main/${pathWithoutLeadingSlash}`;
  return url.replace(/\/+$/, '');
}

function hydrogenRepoRecipeBaseURL(recipeName: string): string {
  return hydrogenRepoFolderURL(`/cookbook/recipes/${recipeName}`);
}
