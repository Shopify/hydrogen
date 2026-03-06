import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import {ZodError} from 'zod';
import {
  COOKBOOK_PATH,
  REPO_ROOT,
  TEMPLATE_DIRECTORY,
  TEMPLATE_PATH,
} from './constants';
import {loadRecipe} from './recipe';
import {listFilesRecursively, parseGitStatus} from './util';
import {handleZodErrorFromLoadRecipe} from './validate';

/**
 * Apply a recipe to the current project.
 * @param params - The parameters for the recipe.
 * @param params.recipeTitle - The name of the recipe to apply.
 * @param params.noCopyIngredients - Skip copying ingredient files (used during generation).
 * @param params.templatePath - Custom path to the template directory. If not provided, uses templates/skeleton.
 */
export function applyRecipe(params: {
  recipeTitle: string;
  noCopyIngredients?: boolean;
  templatePath?: string;
}): void {
  const recipeDir = path.join(COOKBOOK_PATH, 'recipes', params.recipeTitle);
  const recipeYamlPath = path.join(recipeDir, 'recipe.yaml');
  const templatePath = params.templatePath
    ? path.resolve(REPO_ROOT, params.templatePath)
    : TEMPLATE_PATH;

  console.log(`- 🍱 Loading recipe '${params.recipeTitle}'…`);
  if (params.templatePath) {
    console.log(`- 📁 Using custom template path: ${templatePath}`);
  }

  let recipe;
  try {
    recipe = loadRecipe({directory: recipeDir});
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodErrorFromLoadRecipe(error, params.recipeTitle, recipeYamlPath);
      process.exit(1);
    }
    throw error;
  }

  // list the ingredients in the recipe's ingredients folder as a list of flat paths (e.g. foo/bar/baz.txt)
  const ingredientsPath = path.join(recipeDir, 'ingredients');
  const fsIngredients = fs.existsSync(ingredientsPath)
    ? listFilesRecursively(ingredientsPath)
    : [];

  // if the template directory contains modified files, exit with an error
  console.log(`- 🔄 Checking template directory…`);
  // Skip git status check in CI environment
  if (process.env.CI !== 'true') {
    const status = parseGitStatus({filenamesToIgnore: []});
    if (
      status.modifiedFiles.filter(
        (f) => !['package.json', 'package-lock.json'].includes(f),
      ).length > 0
    ) {
      throw new Error('Template folder has uncommitted changes.');
    }
  } else {
    console.log('  - Skipping git status check in CI environment');
  }

  // check that each ingredient in the recipe is present in the ingredients folder
  console.log(`- 🍣 Checking ingredients…`);
  // filter out public ingredients as they might contain assets we don't need to cross-check
  const nonPublicFSIngredients = fsIngredients.filter(
    (ingredient) =>
      !ingredient.startsWith(path.join(TEMPLATE_DIRECTORY, 'public/')),
  );
  const nonPublicRecipeIngredients = recipe.ingredients.filter(
    (i) => !i.path.startsWith(path.join(TEMPLATE_DIRECTORY, 'public/')),
  );
  if (
    nonPublicFSIngredients.length !== nonPublicRecipeIngredients.length ||
    !nonPublicFSIngredients.every((ingredient) =>
      nonPublicRecipeIngredients.some((i) => i.path === ingredient),
    )
  ) {
    console.error(nonPublicFSIngredients);
    console.error(nonPublicRecipeIngredients);
    throw new Error('Ingredients do not match.');
  }

  // delete every file in the deletedFiles array
  console.log(`- 🗑️ Deleting files…`);
  for (const file of recipe.deletedFiles ?? []) {
    console.log('  - Deleting', file);
    // When using a custom template path, adjust the file path to be relative to the template
    const fileToDelete = params.templatePath
      ? path.join(templatePath, file.replace(TEMPLATE_DIRECTORY, ''))
      : path.join(REPO_ROOT, file);
    fs.unlinkSync(fileToDelete);
  }

  // copy over every ingredient to the template directory
  console.log(`- 🗳️ Copying ingredients…`);
  if (!params.noCopyIngredients) {
    for (const ingredient of fsIngredients) {
      const dir = path.dirname(
        path.join(templatePath, ingredient.replace(TEMPLATE_DIRECTORY, '')),
      );
      const src = path.join(recipeDir, 'ingredients', ingredient);
      const dst = path.join(dir, path.basename(ingredient));
      console.log('  - Copying', path.basename(src));
      fs.mkdirSync(dir, {recursive: true});
      fs.copyFileSync(src, dst);
    }
  }

  // apply the patches to the template directory
  console.log(`- 🥣 Applying steps…`);
  const conflictFiles: {orig: string[]; rej: string[]} = {orig: [], rej: []};

  for (let i = 0; i < recipe.steps.length; i++) {
    const step = recipe.steps[i];
    if (step.diffs == null || step.diffs.length === 0) {
      continue;
    }

    for (const diff of step.diffs) {
      console.log(`  - 🩹 Patching ${diff.file} with ${diff.patchFile}…`);
      const patchPath = path.join(recipeDir, 'patches', diff.patchFile);
      const destPath = path.join(templatePath, diff.file);

      try {
        execSync(`patch '${destPath}' '${patchPath}'`, {stdio: 'inherit'});
      } catch (error) {
        console.error(
          `  ⚠️  Patch command failed or returned non-zero exit code`,
        );
      }

      // Check for conflict files
      const origPath = `${destPath}.orig`;
      const rejPath = `${destPath}.rej`;

      if (fs.existsSync(origPath)) {
        console.error(`  ⚠️  Backup file created: ${path.basename(origPath)}`);
        conflictFiles.orig.push(origPath);
      }

      if (fs.existsSync(rejPath)) {
        console.error(`  ❌ Patch rejected: ${path.basename(rejPath)}`);
        conflictFiles.rej.push(rejPath);

        // Show the contents of the .rej file to help with debugging
        try {
          const rejContent = fs.readFileSync(rejPath, 'utf-8');
          console.error(
            `\n  === Rejected hunks from ${path.basename(diff.file)} ===`,
          );
          console.error(
            rejContent
              .split('\n')
              .map((line) => `  | ${line}`)
              .join('\n'),
          );
          console.error(`  === End rejected hunks ===\n`);
        } catch (e) {
          // Ignore if we can't read the file
        }
      }
    }
  }

  if (conflictFiles.orig.length > 0 || conflictFiles.rej.length > 0) {
    console.error(`\n❌ PATCH CONFLICTS DETECTED!\n`);

    if (conflictFiles.orig.length > 0) {
      console.error(`📝 Backup files created (.orig):`);
      console.error(
        `   These indicate patches that applied with offset or fuzz.`,
      );
      conflictFiles.orig.forEach((file) => {
        console.error(`   - ${file}`);
      });
      console.error('');
    }

    if (conflictFiles.rej.length > 0) {
      console.error(`🚫 Rejected patches (.rej):`);
      console.error(
        `   These patches could not be applied to the current code.`,
      );
      conflictFiles.rej.forEach((file) => {
        console.error(`   - ${file}`);
      });
      console.error('');
    }

    console.error(`📋 To resolve:`);
    console.error(
      `   1. Review the .orig and .rej files to understand the conflicts`,
    );
    console.error(`   2. Manually apply the necessary changes`);
    console.error(`   3. Delete the .orig and .rej files when resolved`);
    console.error(
      `   4. Consider regenerating the recipe patches if the codebase has changed significantly`,
    );

    throw new Error(
      'Patch conflicts detected. Please resolve conflicts before proceeding.',
    );
  }
}
