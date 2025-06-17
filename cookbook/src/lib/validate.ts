import {execSync} from 'child_process';
import {rmSync} from 'fs';
import {applyRecipe} from './apply';
import {TEMPLATE_PATH} from './constants';
import path from 'path';
/**
 * Validate a recipe.
 * @param params - The parameters for the validation.
 */
export function validateRecipe(params: {
  recipeTitle: string;
  hydrogenPackagesVersion?: string;
}): boolean {
  const start = Date.now();

  const {recipeTitle, hydrogenPackagesVersion} = params;

  try {
    console.log(`- 🧑‍🍳 Applying recipe '${recipeTitle}'`);
    applyRecipe({
      recipeTitle,
    });

    let validationCommands: string[] = [
      // Install dependencies
      'npm install',
      // Codegen
      'npm run codegen',
      // Typecheck
      'npm run typecheck',
      // Build
      'npm run build',
    ];

    if (hydrogenPackagesVersion != null) {
      console.log(`- 🔼 Applying Hydrogen version ${hydrogenPackagesVersion}…`);
      rmSync(path.join(TEMPLATE_PATH, 'package-lock.json'), {force: true});
      const packages = [
        'https://registry.npmjs.org/@shopify/cli-hydrogen/-/cli-hydrogen',
        'https://registry.npmjs.org/@shopify/hydrogen/-/hydrogen',
        'https://registry.npmjs.org/@shopify/remix-oxygen/-/remix-oxygen',
      ];
      // If the command is invoked with a specific Hydrogen version, explicitly install the packages.
      validationCommands = [
        `npm install ${packages.map((p) => `${p}-${hydrogenPackagesVersion}.tgz`).join(' ')}`,
        ...validationCommands,
      ];
    }

    for (const command of validationCommands) {
      console.log(`- 🔬 Running ${command}…`);
      execSync(command, {cwd: TEMPLATE_PATH});
    }

    const duration = Date.now() - start;
    console.log(`✅ Recipe '${recipeTitle}' is valid (${duration}ms)`);

    return true;
  } catch (error) {
    console.error(error);
    return false;
  } finally {
    // rewind the changes to the template directory
    execSync(`git checkout -- .`, {cwd: TEMPLATE_PATH});
  }
}
