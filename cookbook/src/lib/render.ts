import fs from 'fs';
import path from 'path';
import {
  COOKBOOK_PATH,
  RENDER_FILENAME_GITHUB,
  TEMPLATE_DIRECTORY,
} from './constants';
import {isText} from 'istextorbinary';
import {
  maybeMDBlock,
  MDBlock,
  mdCode,
  mdFrontMatter,
  mdHeading,
  mdImage,
  mdLinkString,
  mdList,
  mdNote,
  mdParagraph,
  mdRawHTML,
  mdTable,
  serializeMDBlocksToFile,
} from './markdown';
import {isSubstep, loadRecipe, Recipe, Step} from './recipe';
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
      params.format === 'github' ? RENDER_FILENAME_GITHUB : `${recipeName}.mdx`,
    ),
    params.format,
  );
}

export function makeReadmeBlocks(
  recipeName: string,
  recipe: Recipe,
  format: RenderFormat,
): MDBlock[] {
  const markdownTitle = makeTitle(recipeName, recipe, format);

  const htmlCopyPromptTarget = makeCopyPromptTarget(recipe, recipeName, format);

  const markdownDescription = mdParagraph(recipe.description);

  const markdownNotes = maybeMDBlock(recipe.notes, (notes) =>
    notes.map(mdNote),
  );

  const markdownIngredients = makeIngredients(recipe, recipeName);

  const markdownSteps = makeSteps(
    recipe.steps,
    recipe,
    recipeName,
    getPatchesDir(recipeName),
    format,
  );

  const deletedFilesThatWereNotRenamed = recipe.deletedFiles?.filter(
    (file) =>
      !recipe.steps.some((step) =>
        step.ingredients?.some((ingredient) => ingredient.renamedFrom === file),
      ),
  );
  const markdownDeletedFiles =
    deletedFilesThatWereNotRenamed != null &&
    deletedFilesThatWereNotRenamed.length > 0
      ? [
          mdHeading(2, 'Deleted Files'),
          mdList(
            deletedFilesThatWereNotRenamed.map((file) => {
              const linkPrefix = hydrogenRepoFolderURL({
                path: '',
                hash: recipe.commit,
                raw: false,
              });
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

  const markdownNextSteps =
    recipe.nextSteps != null
      ? [mdHeading(2, 'Next steps'), mdParagraph(recipe.nextSteps)]
      : [];

  const blocks: MDBlock[] = [
    markdownTitle,
    ...(htmlCopyPromptTarget != null ? [htmlCopyPromptTarget] : []),
    markdownDescription,
    ...markdownNotes,
    ...markdownRequirements,
    ...markdownIngredients,
    ...markdownSteps,
    ...markdownDeletedFiles,
    ...markdownNextSteps,
  ];

  return blocks;
}

function makeIngredients(recipe: Recipe, recipeName: string): MDBlock[] {
  if (recipe.ingredients.length === 0) {
    return [];
  }

  return [
    mdHeading(2, 'Ingredients'),
    mdParagraph('_New files added to the template by this recipe._'),
    mdTable(
      ['File', 'Description'],
      recipe.ingredients.map((ingredient): string[] => {
        const link =
          hydrogenRepoRecipeBaseURL({
            recipeName,
            hash: recipe.commit,
            raw: false,
          }) + `/ingredients/${ingredient.path}`;
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
  recipe: Recipe,
  recipeName: string,
  patchesDir: string,
  format: RenderFormat,
): MDBlock[] {
  const markdownStepsHeader = mdHeading(2, 'Steps');
  return [
    ...(format === 'github' ? [markdownStepsHeader] : []),
    ...steps.flatMap((step) =>
      renderStep(step, recipe, recipeName, patchesDir, format, {
        collapseDiffs: true,
        diffsRelativeToTemplate: format === 'shopify.dev',
        trimDiffHeaders: format === 'shopify.dev',
      }),
    ),
  ];
}

export function renderStep(
  step: Step,
  recipe: Recipe,
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

    const baseHeadingLevel = 4;
    return step.diffs.flatMap((diff) => {
      const headingLevel = baseHeadingLevel + (isSubstep(step) ? 1 : 0);

      const patchFile = path.join(patchesDir, diff.patchFile);
      const rawPatch = fs.readFileSync(patchFile, 'utf8').trim();

      const patch = options.trimDiffHeaders
        ? rawPatch.split('\n').slice(3).join('\n')
        : rawPatch;

      const collapsed =
        options.collapseDiffs === true &&
        patch.split('\n').length > COLLAPSE_DIFF_LINES;

      const linkPrefixRepo = hydrogenRepoFolderURL({
        path: '',
        hash: recipe.commit,
        raw: false,
      });
      const linkPrefixRecipe = hydrogenRepoRecipeBaseURL({
        recipeName,
        hash: recipe.commit,
        raw: false,
      });
      const link = `${linkPrefixRepo}/templates/skeleton/${diff.file}`;

      return [
        format === 'github'
          ? mdHeading(
              headingLevel,
              options.diffsRelativeToTemplate
                ? `File: /${diff.file}`
                : `File: ${mdLinkString(link, diff.file)}`,
            )
          : mdHeading(
              headingLevel,
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

  function getContent(ingredient: string): MDBlock {
    const relativePath = path.join('./', 'ingredients', ingredient);
    const remotePath =
      hydrogenRepoRecipeBaseURL({
        recipeName,
        hash: recipe.commit,
        raw: true,
      }) + `/ingredients/${ingredient}`;

    const fullPath = path.join(
      COOKBOOK_PATH,
      'recipes',
      recipeName,
      relativePath,
    );

    if (isText(ingredient)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const collapsed = options.collapseDiffs === true;

      return mdCode(path.extname(ingredient).slice(1), content, collapsed);
    } else {
      const filePath = format === 'github' ? relativePath : remotePath;
      return mdImage(ingredient, filePath);
    }
  }

  function getIngredientFile(): MDBlock[] {
    if (step.type !== 'NEW_FILE' || step.ingredients == null) {
      return [];
    }

    let blocks: MDBlock[] = [];
    const baseHeadingLevel = 4;
    for (const {path: ingredient, renamedFrom} of step.ingredients) {
      const headingLevel = baseHeadingLevel + (isSubstep(step) ? 1 : 0);

      const link =
        hydrogenRepoRecipeBaseURL({
          recipeName,
          hash: recipe.commit,
          raw: false,
        }) + `/ingredients/${ingredient}`;

      blocks.push(
        ...(renamedFrom != null
          ? [
              mdNote(
                `Rename \`${renamedFrom.replace(TEMPLATE_DIRECTORY, '')}\` to \`${ingredient.replace(TEMPLATE_DIRECTORY, '')}\`.`,
              ),
            ]
          : []),
        mdHeading(
          headingLevel,
          ['File:', `${mdLinkString(link, path.basename(ingredient))}`].join(
            ' ',
          ),
        ),
        getContent(ingredient),
      );
    }
    return blocks;
  }

  const baseHeadingLevel = format === 'github' ? 3 : 2;
  const headingLevel = baseHeadingLevel + (isSubstep(step) ? 1 : 0);

  const markdownStep: MDBlock[] = [
    mdHeading(headingLevel, `Step ${step.step}: ${step.name}`),
    ...(step.notes?.map(mdNote) ?? []),
    mdParagraph(step.description ?? ''),
    ...(step.type !== 'NEW_FILE' && step.ingredients != null
      ? [
          mdList(
            step.ingredients
              .filter((ingredient) =>
                recipe.ingredients.some(
                  (other) => other.path === ingredient.path,
                ),
              )
              .map((ingredient) => {
                const linkPrefix = hydrogenRepoRecipeBaseURL({
                  recipeName,
                  hash: recipe.commit,
                  raw: false,
                });
                return mdLinkString(
                  `${linkPrefix}/ingredients/${ingredient.path}`,
                  ingredient.path.replace(TEMPLATE_DIRECTORY, ''),
                );
              }),
          ),
        ]
      : []),
    ...getDiffs(),
    ...getIngredientFile(),
  ];

  return markdownStep;
}

function makeTitle(
  recipeName: string,
  recipe: Recipe,
  format: RenderFormat,
): MDBlock {
  switch (format) {
    case 'shopify.dev':
      return mdFrontMatter(
        {
          gid: recipe.gid,
          title: `${recipe.title} in Hydrogen`,
          description: recipe.summary,
        },
        [doNotEditComment(recipeName)],
      );
    case 'github':
      return mdHeading(1, `${recipe.title} in Hydrogen`);
    default:
      assertNever(format);
  }
}

const HYDROGEN_REPO_BASE_URL = 'https://github.com/Shopify/hydrogen';
const HYDROGEN_REPO_RAW_BASE_URL =
  'https://raw.githubusercontent.com/Shopify/hydrogen';

function hydrogenRepoFolderURL(params: {
  path: string;
  hash: string;
  raw: boolean;
}): string {
  const {path, hash, raw} = params;
  const pathWithoutLeadingSlash = path.startsWith('/') ? path.slice(1) : path;
  const baseURL = raw
    ? HYDROGEN_REPO_RAW_BASE_URL
    : HYDROGEN_REPO_BASE_URL + '/blob';
  const url = `${baseURL}/${hash}/${pathWithoutLeadingSlash}`;
  return url.replace(/\/+$/, '');
}

function hydrogenRepoRecipeBaseURL(params: {
  recipeName: string;
  hash: string;
  raw: boolean;
}): string {
  const {recipeName, hash, raw} = params;
  return hydrogenRepoFolderURL({
    path: `/cookbook/recipes/${recipeName}`,
    hash,
    raw,
  });
}

function doNotEditComment(recipeName: string): string {
  return `DO NOT EDIT. This file is generated from the shopify/hydrogen repo from this source file: \`cookbook/recipes/${recipeName}/recipe.yaml\``;
}

const copyPromptTargetClass = 'copy-prompt-button';

function makeCopyPromptTarget(
  recipe: Recipe,
  recipeName: string,
  format: RenderFormat,
): MDBlock | null {
  if (format !== 'shopify.dev') {
    return null;
  }

  const dataURL = `${HYDROGEN_REPO_RAW_BASE_URL}/${recipe.commit}/cookbook/llms/${recipeName}.prompt.md`;
  const dataInstructions = 'Follow this recipe to implement this feature.';

  return mdRawHTML(
    `<div class="${copyPromptTargetClass}" data-url="${dataURL}" data-instructions="${dataInstructions}"></div>`,
  );
}
