import {execSync, ExecSyncOptionsWithBufferEncoding} from 'child_process';
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

    const validationCommands: Command[] = [
      ...(hydrogenPackagesVersion != null
        ? [installHydrogenPackages(hydrogenPackagesVersion)]
        : []),
      installDependencies(),
      runCodegen(),
      runTypecheck(),
      buildSkeleton(),
    ];

    for (const {command, options} of validationCommands) {
      console.log(`- 🔬 Running ${command}…`);
      execSync(command, options);
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

type Command = {
  command: string;
  options: ExecSyncOptionsWithBufferEncoding;
};

function installDependencies(): Command {
  return {
    command: 'npm install',
    options: {cwd: TEMPLATE_PATH},
  };
}

function runCodegen(): Command {
  return {
    command: 'npm run codegen',
    options: {cwd: TEMPLATE_PATH},
  };
}

function runTypecheck(): Command {
  return {
    command: 'npm run typecheck',
    options: {cwd: TEMPLATE_PATH},
  };
}

function buildSkeleton(): Command {
  return {
    command: 'npm run build',
    options: {cwd: TEMPLATE_PATH},
  };
}

function installHydrogenPackages(version: string): Command {
  rmSync(path.join(TEMPLATE_PATH, 'package-lock.json'), {force: true});
  const packages = [
    'https://registry.npmjs.org/@shopify/cli-hydrogen/-/cli-hydrogen',
    'https://registry.npmjs.org/@shopify/hydrogen/-/hydrogen',
  ];
  return {
    command: `npm install ${packages.map((p) => `${p}-${version}.tgz`).join(' ')}`,
    options: {cwd: TEMPLATE_PATH},
  };
}
