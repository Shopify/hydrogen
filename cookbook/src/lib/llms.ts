import path from 'path';
import {COOKBOOK_PATH, REPO_ROOT} from './constants';
import {createDirectoryIfNotExists, getPatchesDir} from './util';
import {
  maybeMDBlock,
  MDBlock,
  mdFrontMatter,
  mdHeading,
  mdList,
  mdNote,
  mdParagraph,
  serializeMDBlocksToFile,
} from './markdown';
import {renderStep} from './render';
import {loadRecipe, Recipe} from './recipe';

function renderRecipeRuleBlocks(
  recipeName: string,
  recipe: Recipe,
  globs: 'templates/**/*' | '*',
): MDBlock[] {
  return [
    // cursor rule frontmatter
    mdFrontMatter({
      description: `Recipe for implementing "${recipe.title} (${recipeName})" in a Hydrogen storefront. ${recipe.summary}`,
      globs,
      alwaysApply: 'false',
    }),

    // preamble
    mdParagraph(
      `
# Overview

This rule describes how to implement "${recipe.title}" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.

The same logic can be applied to any other Hydrogen storefront project, adapting the implementation details to the specific needs/structure/conventions of the project, but it's up to the developer to do so.

If there are any prerequisites, the recipe below will explain them; if the user is trying to implement the feature described in this recipe, make sure to prominently mention the prerequisites and any other preliminary instructions, as well as followups.

Please remember that specific documentation about Storefront API, which might be relevant to the user, is available at <https://shopify.dev/docs/api/storefront>.

If the user is asking on how to implement the feature from scratch, please first describe the feature in a general way before jumping into the implementation details.

Please note that the recipe steps below are not necessarily ordered in the way they should be executed, as it depends on the user's needs and the specific details of the project. The recipe steps descriptions should allow you to understand what is required to be done in a certain order and what is not. Remember that file names in the recipe are related to the Hydrogen skeleton template, not the user's project, so make sure to adapt the file names to the user's project.

# Summary

${recipe.summary}

# User Intent Recognition

<user_queries>
${recipe.llms.userQueries.map((query) => `- ${query}`).join('\n')}
</user_queries>

# Troubleshooting

<troubleshooting>
${recipe.llms.troubleshooting
  .map((troubleshooting) =>
    `
- **Issue**: ${troubleshooting.issue}
  **Solution**: ${troubleshooting.solution}\
`.trim(),
  )
  .join('\n')}
</troubleshooting>

# Recipe Implementation

Here's the ${recipeName} recipe for the base Hydrogen skeleton template:
`.trim(),
    ),

    // recipe data
    mdParagraph(`<recipe_implementation>`),
    ...[
      mdHeading(2, 'Description'),
      mdParagraph(recipe.description),

      // notes
      ...(recipe.notes != null && recipe.notes.length > 0
        ? [
            mdHeading(2, 'Notes'),
            ...maybeMDBlock(recipe.notes, (notes) => notes.map(mdNote)),
          ]
        : []),

      // requirements
      ...(recipe.requirements != null && recipe.requirements.length > 0
        ? [mdHeading(2, 'Requirements'), mdParagraph(recipe.requirements)]
        : []),

      // ingredients
      mdHeading(2, 'Ingredients'),
      mdParagraph('_New files added to the template by this recipe._'),
      mdList(
        recipe.ingredients.map(
          (ingredient) => `\`${ingredient.path}\` : ${ingredient.description}`,
        ),
      ),

      mdHeading(2, 'Steps'),
      ...recipe.steps.flatMap((step, index): MDBlock[] =>
        renderStep(step, index, recipe.ingredients, getPatchesDir(recipeName)),
      ),

      ...(recipe.deletedFiles != null && recipe.deletedFiles.length > 0
        ? [
            mdHeading(2, 'Deleted Files'),
            mdList(recipe.deletedFiles.map((file) => `[\`${file}\`](${file})`)),
          ]
        : []),
    ],
    mdParagraph(`</recipe_implementation>`),
  ];
}

export function generateLLMsFiles(recipeName: string) {
  createDirectoryIfNotExists(path.join(REPO_ROOT, '.cursor', 'rules'));

  console.log('Generating recipe Cursor rule…');
  console.log(`- ${recipeName}`);
  const recipe = loadRecipe({
    directory: path.join(COOKBOOK_PATH, 'recipes', recipeName),
  });

  const blocks = renderRecipeRuleBlocks(recipeName, recipe, 'templates/**/*');

  serializeMDBlocksToFile(blocks, getRecipeRulePath(recipeName), 'github');
}

function getRecipeRulePath(recipeName: string) {
  return path.join(
    REPO_ROOT,
    '.cursor',
    'rules',
    `cookbook-recipe-${recipeName}.mdc`,
  );
}
