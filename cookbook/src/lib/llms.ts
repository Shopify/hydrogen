import fs from 'fs';
import path from 'path';
import {COOKBOOK_PATH, REPO_ROOT} from './constants';
import {createDirectoryIfNotExists, getPatchesDir, listRecipes} from './util';
import {
  maybeMDBlock,
  MDBlock,
  mdFrontMatter,
  mdHeading,
  mdLinkString,
  mdList,
  mdNote,
  mdParagraph,
  renderMDBlock,
  serializeMDBlocksToFile,
} from './markdown';
import {renderStep} from './render';
import {parseRecipeFromString, Recipe} from './recipe';

function makeCookbookCursorRule(recipes: string[], data: string) {
  return `---
description: Hydrogen Cookbook
globs: templates/**/*
alwaysApply: false
---

# What the cookbook is

The cookbook is a collection of recipes to be applied on the skeleton template, like blueprints.

The cookbook path, when refered to, should always be just \`cookbook/\`.

All cookbook commands are invoked via the umbrella \`cookbook\` script, which can be invoked from the \`cookbooks\` directory with \`npm run cookbook\` and then passing the name of the desired command and its arguments. For example \`npm run cookbook -- <name of the command> [arguments...]\`.

# What a recipe is

A recipe is a set of instructions and patches that can be applied to the Hydrogen skeleton template. Think of them as blueprints to showcase Hydrogen use cases.

# Available recipes

The available recipes are the names of the folders in the \`cookbooks/recipes/\` directory that contain a \`recipes.json\` file.

The current available recipes are:

${recipes.map((recipe) => `- ${recipe}`).join('\n')}

Here's the detailed explanation of how the cookbook works:

--- BEGIN COOKBOOK DATA ---
${data}
--- END COOKBOOK DATA ---
`;
}

function generateCookbookCursorRule() {
  const recipes = listRecipes();
  const cookbookCursorRule = makeCookbookCursorRule(
    recipes,
    fs.readFileSync(path.join(REPO_ROOT, 'cookbook', 'README.md'), 'utf8'),
  );
  fs.writeFileSync(
    path.join(REPO_ROOT, '.cursor', 'rules', 'cookbook.mdc'),
    cookbookCursorRule,
  );
}

function generateLLMsFullTxt() {
  const recipes = listRecipes();
  const llmsFullTxtBlocks: MDBlock[] = [
    mdParagraph(fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8')),
    mdParagraph(
      fs.readFileSync(path.join(REPO_ROOT, 'cookbook', 'README.md'), 'utf8'),
    ),
    ...recipes.map((recipe) =>
      mdParagraph(
        fs.readFileSync(
          path.join(REPO_ROOT, `cookbook/recipes/${recipe}/README.md`),
          'utf8',
        ),
      ),
    ),
  ];
  fs.writeFileSync(
    path.join(REPO_ROOT, 'llms-full.txt'),
    llmsFullTxtBlocks.map(renderMDBlock).join('\n\n'),
  );
}

function generateLLMsTxt() {
  const recipes = listRecipes();

  const llmsTxtBlocks: MDBlock[] = [
    mdHeading(1, 'Hydrogen Documentation'),
    mdHeading(2, 'Docs'),
    mdHeading(3, 'Framework'),
    mdList([
      mdLinkString(
        'https://shopify.dev/docs/hydrogen/getting-started/overview',
        'Hydrogen Documentation',
      ),
      mdLinkString(
        'https://github.com/Shopify/hydrogen/blob/451c72ea0f4791ab6fb5796dbbe2ad31cdc2c2e7/cookbook/README.md',
        'Cookbook',
      ),
      ...recipes.map((recipe) =>
        mdLinkString(
          `https://github.com/Shopify/hydrogen/blob/451c72ea0f4791ab6fb5796dbbe2ad31cdc2c2e7/cookbook/recipes/${recipe}/README.md`, // TODO replace with `https://shopify.dev/docs/hydrogen/recipes/${recipe}`,
          `Recipe: ${recipe}`,
        ),
      ),
    ]),
    mdHeading(3, 'Storefront API'),
    mdList([
      mdLinkString(
        'https://shopify.dev/docs/api/storefront/',
        'GraphQL Storefront API',
      ),
      // TODO more specific links?
    ]),
  ];
  fs.writeFileSync(
    path.join(REPO_ROOT, 'llms.txt'),
    llmsTxtBlocks.map(renderMDBlock).join('\n\n'),
  );
}

function renderRecipeRuleBlocks(
  recipeName: string,
  recipe: Recipe,
  globs: 'templates/**/*' | '*',
): MDBlock[] {
  return [
    // cursor rule frontmatter
    mdFrontMatter({
      description: `Recipe for implementing "${recipe.title} (${recipeName})" in a Hydrogen storefront. Useful when the user is trying to implement the feature described in this recipe.`,
      globs,
      alwaysApply: 'false',
    }),

    // preamble
    mdParagraph(
      `This rule describes how to implement "\`${recipe.title} (${recipeName})\`" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.
The same logic can be applied to any other Hydrogen storefront project, adapting the implementation details to the specific needs/structure/conventions of the project, but it's up to the developer to do so.

If there are any prerequisites, the recipe below will explain them; if the user is trying to implement the feature described in this recipe, make sure to prominently mention the prerequisites and any other preliminary instructions, as well as followups.

Please remember that specific documentation about Storefront API, which might be relevant to the user, is available at <https://shopify.dev/docs/api/storefront>.

If the user is asking on how to implement the feature from scratch, please first describe the feature in a general way before jumping into the implementation details.

Please note that the recipe steps below are not necessarily ordered in the way they should be executed, as it depends on the user's needs and the specific details of the project. The recipe steps descriptions should allow you to understand what is required to be done in a certain order and what is not. Remember that file names in the recipe are related to the Hydrogen skeleton template, not the user's project, so make sure to adapt the file names to the user's project.

Here's the ${recipeName} recipe for the base Hydrogen skeleton template:`,
    ),

    // recipe data
    mdParagraph(`--- BEGIN RECIPE DATA ---`),
    ...[
      mdHeading(2, 'Description'),
      mdParagraph(recipe.description),

      ...(recipe.notes != null && recipe.notes.length > 0
        ? [
            mdHeading(2, 'Notes'),
            ...maybeMDBlock(recipe.notes, (notes) => notes.map(mdNote)),
          ]
        : []),

      mdHeading(2, 'Ingredients'),
      mdList(
        recipe.ingredients.map(
          (ingredient) => `\`${ingredient.path}\` : ${ingredient.description}`,
        ),
      ),

      mdHeading(2, 'Steps'),
      ...recipe.steps.flatMap((step, index): MDBlock[] =>
        renderStep(
          step,
          index,
          recipe.ingredients,
          'github',
          getPatchesDir(recipeName),
        ),
      ),

      ...(recipe.deletedFiles != null && recipe.deletedFiles.length > 0
        ? [
            mdHeading(2, 'Deleted Files'),
            mdList(recipe.deletedFiles.map((file) => `[\`${file}\`](${file})`)),
          ]
        : []),
    ],
    mdParagraph(`--- END RECIPE DATA ---`),
  ];
}

export function generateLLMsFiles(recipeName?: string) {
  let recipes: string[] = [];
  if (recipeName == null) {
    recipes = listRecipes();
  } else {
    recipes = [recipeName];
  }

  console.log('Generating llms.txt…');
  generateLLMsTxt();
  console.log('Generating llms-full.txt…');
  generateLLMsFullTxt();

  createDirectoryIfNotExists(path.join(REPO_ROOT, '.cursor', 'rules'));

  console.log('Generating cookbook cursor rule…');
  generateCookbookCursorRule();

  console.log('Generating recipe cursor rules…');
  for (const recipeName of recipes) {
    console.log(`- ${recipeName}`);
    const recipe = parseRecipeFromString(
      fs.readFileSync(
        path.join(COOKBOOK_PATH, `recipes/${recipeName}/recipe.json`),
        'utf8',
      ),
    );

    const blocks = renderRecipeRuleBlocks(recipeName, recipe, 'templates/**/*');

    serializeMDBlocksToFile(
      blocks,
      path.join(
        REPO_ROOT,
        '.cursor',
        'rules',
        `cookbook-recipe-${recipeName}.mdc`,
      ),
    );
  }
}
